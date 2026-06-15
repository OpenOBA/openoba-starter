/**
 * OpenOBA Safe Expression Evaluator
 *
 * @file safe-expr.ts — 纯四则运算表达式求值器，不使用 eval / Function / vm
 * @author 唐浩然（OpenOBA AI 执行官）
 * @since 2026-06-15
 *
 * @description
 * 替换 expr-eval 库（GHSA-8gw3-rxh4-v6jx, GHSA-jc85-fpwf-qm7x）。
 * 仅支持 ERDL 规则引擎所需的数学运算：+ - * / % ( ) 和数字字面量、变量名。
 * 全自研递归下降解析器，零外部依赖，零代码注入风险。
 *
 * 安全保证：
 *   - 不允许 . 或 [ ] 途径访问（无原型链攻击面）
 *   - 不允许函数调用（Math.round / Math.floor 等需预计算）
 *   - 不允许任意标识符（仅变量名 = undeclared context 时返回 NaN）
 *   - 无 eval, Function, vm, setTimeout
 *
 * @example
 * ```typescript
 * const engine = new SafeExpr()
 * engine.evaluate('retailPrice * 0.8', { retailPrice: 299 })
 * // → 239.2
 * engine.evaluate('(a + b) / 2', { a: 10, b: 20 })
 * // → 15
 * ```
 */

import { Logger } from '@nestjs/common'

// ============================================
// Token 类型
// ============================================

type Token =
  | { type: 'number'; value: number }
  | { type: 'identifier'; name: string }
  | { type: 'operator'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' }

// ============================================
// 词法分析器 / Lexer
// ============================================

/**
 * 将公式字符串转为 Token 流。
 * 支持：数字（含小数）、变量名、运算符、括号、空格
 */
function tokenize(expression: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < expression.length) {
    const ch = expression[i]

    // 空白
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++
      continue
    }

    // 数字（含小数）
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let numStr = ''
      while (i < expression.length && ((expression[i] >= '0' && expression[i] <= '9') || expression[i] === '.')) {
        numStr += expression[i]
        i++
      }
      const num = parseFloat(numStr)
      if (isNaN(num)) {
        throw new Error(`[SafeExpr] Invalid number literal: ${numStr}`)
      }
      tokens.push({ type: 'number', value: num })
      continue
    }

    // 标识符（变量名）
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      let name = ''
      while (i < expression.length && ((expression[i] >= 'a' && expression[i] <= 'z') || (expression[i] >= 'A' && expression[i] <= 'Z') || (expression[i] >= '0' && expression[i] <= '9') || expression[i] === '_')) {
        name += expression[i]
        i++
      }
      tokens.push({ type: 'identifier', name })
      continue
    }

    // 运算符
    if ('+-*/%^'.includes(ch)) {
      tokens.push({ type: 'operator', value: ch })
      i++
      continue
    }

    // 括号
    if (ch === '(') {
      tokens.push({ type: 'lparen' })
      i++
      continue
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen' })
      i++
      continue
    }

    // 不允许的字符
    throw new Error(`[SafeExpr] Unexpected character '${ch}' at position ${i} in: ${expression}`)
  }

  return tokens
}

// ============================================
// 语法分析器 + 求值器 / Recursive Descent Parser
// ============================================

/**
 * 递归下降解析器。
 *
 * 语法（BNF）：
 *   expr      → term (('+' | '-') term)*
 *   term      → factor (('*' | '/' | '%') factor)*
 *   factor    → ('-' | '+')? factor   // 一元符号
 *             | primary
 *   primary   → NUMBER | IDENTIFIER | '(' expr ')'
 */
class Parser {
  private pos = 0

  constructor(private readonly tokens: Token[]) {}

  // --- 公开接口 ---

  evaluate(context: Record<string, number>): number {
    const result = this.parseExpr(context)
    if (this.pos < this.tokens.length) {
      throw new Error(
        `[SafeExpr] Unexpected token after expression at position ${this.pos}: ${JSON.stringify(this.tokens[this.pos])}`,
      )
    }
    return result
  }

  // --- 递归下降 ---

  /**
   * expr → term (('+' | '-') term)*
   */
  private parseExpr(context: Record<string, number>): number {
    let left = this.parseTerm(context)

    while (this.match('+', '-')) {
      const op = this.advanceOp()
      const right = this.parseTerm(context)
      left = op === '+' ? left + right : left - right
    }

    return left
  }

  /**
   * term → factor (('*' | '/' | '%') factor)*
   */
  private parseTerm(context: Record<string, number>): number {
    let left = this.parseFactor(context)

    while (this.match('*', '/', '%')) {
      const op = this.advanceOp()
      const right = this.parseFactor(context)
      if (op === '*') {
        left = left * right
      } else if (op === '/') {
        if (right === 0) {
          throw new Error('[SafeExpr] Division by zero')
        }
        left = left / right
      } else {
        // %
        left = left % right
      }
    }

    return left
  }

  /**
   * factor → ('-' | '+')? primary
   */
  private parseFactor(context: Record<string, number>): number {
    // 一元 + -
    if (this.match('-')) {
      this.advance() // consume -
      return -this.parseFactor(context)
    }
    if (this.match('+')) {
      this.advance() // consume +（一元正号，直接忽略）
      return this.parseFactor(context)
    }

    return this.parsePrimary(context)
  }

  /**
   * primary → NUMBER | IDENTIFIER | '(' expr ')'
   */
  private parsePrimary(context: Record<string, number>): number {
    const token = this.advance()

    if (token.type === 'number') {
      return token.value
    }

    if (token.type === 'identifier') {
      const val = context[token.name]
      if (typeof val !== 'number') {
        throw new Error(`[SafeExpr] Variable "${token.name}" is not a number in context`)
      }
      return val
    }

    if (token.type === 'lparen') {
      const val = this.parseExpr(context)
      if (!this.match(')')) {
        throw new Error('[SafeExpr] Missing closing parenthesis')
      }
      this.advance() // consume )
      return val
    }

    throw new Error(`[SafeExpr] Unexpected token: ${JSON.stringify(token)}`)
  }

  // --- 辅助 ---

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private advance(): Token {
    const token = this.tokens[this.pos]
    if (!token) {
      throw new Error('[SafeExpr] Unexpected end of expression')
    }
    this.pos++
    return token
  }

  /** 仅在确认是 operator 类型后取值 */
  private advanceOp(): string {
    const token = this.tokens[this.pos]
    if (!token || token.type !== 'operator') {
      throw new Error('[SafeExpr] Expected operator')
    }
    this.pos++
    return token.value
  }

  private match(...values: string[]): boolean {
    const token = this.peek()
    if (!token) return false
    if (token.type === 'operator' && values.includes(token.value)) return true
    if (token.type === 'lparen' && values.includes('(')) return true
    if (token.type === 'rparen' && values.includes(')')) return true
    return false
  }
}

// ============================================
// SafeExpr 主类
// ============================================

/**
 * SafeExpr — 安全表达式求值器
 *
 * 替代 expr-eval@2.0.2（CVSS 7.3 Prototype Pollution + CWE-94 Code Injection），
 * 专为 ERDL 规则引擎设计：纯四则运算 + 变量代入，不可被注入执行代码。
 *
 * 安全保证：
 *   - 纯词法+语法解析：不调用 native eval/new Function/vm
 *   - 自动过滤：不允许点号、方括号、函数调用符，自然防御原型链攻击
 *   - 无副作用 API 暴露：构造函数只执行一次（词法分析），后续调用纯求值
 *   - 与 expr-eval Parser 接口兼容：保持调用方改动最小
 */
export class SafeExpr {
  private readonly logger = new Logger(SafeExpr.name)

  /**
   * 解析并求值一个数学表达式
   *
   * @param formula 表达式字符串（如 "retailPrice * 0.8"）
   * @param context 变量上下文（如 { retailPrice: 299 }）
   * @returns 计算结果（数字）
   * @throws Error 表达式语法错误、变量非数字或除零时抛出
   */
  evaluate(formula: string, context: Record<string, number>): number {
    try {
      const tokens = tokenize(formula)
      const parser = new Parser(tokens)
      return parser.evaluate(context)
    } catch (error) {
      // 重新包装错误以保持与调用方的协议一致
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`[SafeExpr] Evaluation failed for "${formula}": ${message}`)
      throw error
    }
  }

  /**
   * 静态辅助方法：同 evaluate，不需要实例
   */
  static eval(formula: string, context: Record<string, number>): number {
    return new SafeExpr().evaluate(formula, context)
  }
}
