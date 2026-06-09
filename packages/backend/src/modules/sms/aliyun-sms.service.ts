import { Injectable, Logger } from '@nestjs/common'
import * as crypto from 'crypto'

/**
 * 阿里云 SMS 服务
 *
 * 生产环境需要安装 @alicloud/dysmsapi20170525 SDK：
 *   npm install @alicloud/dysmsapi20170525 @alicloud/openapi-client
 *
 * 当前使用 HTTP 直调方式（无需 SDK），适合快速开发。
 * 环境变量（.env）：
 *   ALIYUN_SMS_ACCESS_KEY_ID
 *   ALIYUN_SMS_ACCESS_KEY_SECRET
 *   ALIYUN_SMS_SIGN_NAME
 *   ALIYUN_SMS_TEMPLATE_CODE_LOGIN
 */
@Injectable()
export class AliyunSmsService {
  private readonly logger = new Logger(AliyunSmsService.name)

  private readonly accessKeyId: string
  private readonly accessKeySecret: string
  private readonly signName: string
  private readonly templateCode: string
  private readonly endpoint = 'dysmsapi.aliyuncs.com'

  constructor() {
    // C6-P0修复：移除fallback弱值，使用ConfigService或抛异常
    this.accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID || ''
    this.accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || ''
    this.signName = process.env.ALIYUN_SMS_SIGN_NAME || ''
    this.templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE_LOGIN || ''
    
    if (!this.accessKeyId || !this.accessKeySecret) {
      this.logger.warn('⚠️ 阿里云短信服务未配置（ALIYUN_SMS_ACCESS_KEY_ID / ALIYUN_SMS_ACCESS_KEY_SECRET 为空），短信功能不可用')
    }
    if (!this.signName) {
      this.logger.warn('⚠️ ALIYUN_SMS_SIGN_NAME 未设置')
    }
    if (!this.templateCode || this.templateCode === 'SMS_000000000') {
      this.logger.warn('⚠️ ALIYUN_SMS_TEMPLATE_CODE_LOGIN 未设置，短信模板不可用')
    }
  }

  /**
   * 发送验证码
   * @param phone 手机号
   * @param code 6 位验证码
   * @returns 是否发送成功
   */
  async sendVerificationCode(phone: string, code: string): Promise<boolean> {
    // 如果没有配置阿里云密钥，走开发模式（控制台输出验证码）
    if (!this.accessKeyId || !this.accessKeySecret) {
      this.logger.log(`[DEV MODE] 📱 验证码 → ${phone}: ${code}`)
      return true
    }

    try {
      const result = await this.sendSmsRequest(phone, code)
      if (result.Code === 'OK') {
        this.logger.log(`短信发送成功 → ${phone}`)
        return true
      }
      this.logger.error(`短信发送失败 → ${phone}: ${result.Message} (${result.Code})`)
      return false
    } catch (error) {
      this.logger.error(`短信发送异常 → ${phone}: ${error.message}`)
      return false
    }
  }

  /**
   * 阿里云短信 API 请求
   * 参考：https://help.aliyun.com/document_detail/112149.html
   */
  private async sendSmsRequest(phone: string, code: string): Promise<{ Code: string; Message: string }> {
    const params: Record<string, string> = {
      PhoneNumbers: phone,
      SignName: this.signName,
      TemplateCode: this.templateCode,
      TemplateParam: JSON.stringify({ code }),
      AccessKeyId: this.accessKeyId,
      Action: 'SendSms',
      Version: '2017-05-25',
      Format: 'JSON',
      SignatureMethod: 'HMAC-SHA1',
      SignatureVersion: '1.0',
      SignatureNonce: crypto.randomUUID(),
      Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    }

    // 签名
    const sortedKeys = Object.keys(params).sort()
    const canonicalQueryString = sortedKeys.map((k) => `${this.percentEncode(k)}=${this.percentEncode(params[k])}`).join('&')

    const stringToSign = `POST&%2F&${this.percentEncode(canonicalQueryString)}`
    const signature = crypto
      .createHmac('sha1', this.accessKeySecret + '&')
      .update(stringToSign)
      .digest('base64')

    const formData = new URLSearchParams()
    formData.append('Signature', signature)
    sortedKeys.forEach((k) => formData.append(k, params[k]))

    const response = await fetch(`https://${this.endpoint}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })

    return response.json()
  }

  private percentEncode(s: string): string {
    return encodeURIComponent(s).replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/%7E/g, '~')
  }
}
