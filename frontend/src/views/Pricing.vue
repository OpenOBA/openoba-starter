<template>
  <div class="pricing-page">
    <el-tabs v-model="activeTab" type="card" @tab-click="onTabChange">
      <el-tab-pane label="分级定义" name="tiers">
        <div class="tab-content">
          <div class="toolbar">
            <el-button type="success" @click="openTierDialog()">新增分级</el-button>
            <el-button type="primary" :disabled="!selectedTiers.length" @click="openTierDialog(selectedTiers[0])">编辑</el-button>
            <el-popconfirm title="确认删除选中分级？" @confirm="batchDeleteTiers">
              <template #reference><el-button type="danger" :disabled="!selectedTiers.length">删除</el-button></template>
            </el-popconfirm>
          </div>
          <el-table v-loading="tierLoading" :data="tierList" stripe highlight-current-row @selection-change="(rows: Record<string, unknown>[]) => selectedTiers = rows" @row-dblclick="(row: Record<string, unknown>) => openTierDialog(row)">
            <el-table-column type="selection" width="45" />
            <el-table-column prop="tierCode" label="分级 Code" width="140" />
            <el-table-column prop="tierName" label="分级名称" width="120" />
            <el-table-column prop="positioning" label="定位描述" min-width="200" />
            <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '启用' : '禁用' }}</el-tag></template></el-table-column>
            <el-table-column prop="sortOrder" label="排序" width="80" />
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="阶梯定价" name="wholesale">
        <div class="tab-content">
          <div class="toolbar">
            <el-button type="success" @click="openWholesaleDialog()">新增阶梯</el-button>
            <el-button type="primary" :disabled="!selectedWholesales.length" @click="openWholesaleDialog(selectedWholesales[0])">编辑</el-button>
            <el-popconfirm title="确认删除选中阶梯？" @confirm="batchDeleteWholesales">
              <template #reference><el-button type="danger" :disabled="!selectedWholesales.length">删除</el-button></template>
            </el-popconfirm>
          </div>
          <el-table v-loading="wholesaleLoading" :data="wholesaleList" stripe highlight-current-row @selection-change="(rows: Record<string, unknown>[]) => selectedWholesales = rows" @row-dblclick="(row: Record<string, unknown>) => openWholesaleDialog(row)">
            <el-table-column type="selection" width="45" />
            <el-table-column prop="tierCode" label="阶梯 Code" width="120" />
            <el-table-column prop="tierName" label="阶梯名称" width="120" />
            <el-table-column prop="minQuantity" label="最低起订量" width="120" />
            <el-table-column prop="maxQuantity" label="最高数量" width="120"><template #default="{ row }">{{ row.maxQuantity || '无上限' }}</template></el-table-column>
            <el-table-column prop="discountRate" label="折扣率" width="100"><template #default="{ row }">{{ (row.discountRate * 10).toFixed(1) }}折</template></el-table-column>
            <el-table-column prop="description" label="描述" min-width="200" />
            <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '启用' : '禁用' }}</el-tag></template></el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="协议价管理" name="agreement">
        <div class="tab-content">
          <div class="toolbar">
            <el-select v-model="agreementFilter.customerId" placeholder="选择 B 端客户" clearable style="width: 320px" filterable @change="onAgreementCustomerChange">
              <el-option v-for="c in businessCustomerOptions" :key="c.customerId" :label="c.contactName + (c.companyName ? ' (' + c.companyName + ')' : '') + ' (' + c.customerType + ')'" :value="c.customerId" />
            </el-select>
            <el-button type="success" :disabled="!agreementFilter.customerId" @click="openAgreementDialog()">新增协议价</el-button>
          </div>
          <el-alert v-if="!agreementFilter.customerId" title="请先选择 B 端客户" type="info" :closable="false" style="margin-bottom: 16px" />
          <el-table v-loading="agreementLoading" :data="agreementList" stripe>
            <el-table-column label="模式" width="100"><template #default="{ row }"><el-tag :type="row.pricingMode === 'fixed' ? 'danger' : 'primary'" size="small">{{ row.pricingMode === 'fixed' ? '固定价' : '折扣率' }}</el-tag></template></el-table-column>
            <el-table-column label="价格/折扣" width="120"><template #default="{ row }"><span v-if="row.pricingMode === 'fixed' && row.fixedPrice">¥{{ Number(row.fixedPrice).toFixed(2) }}</span><span v-else-if="row.discountRate">{{ (row.discountRate * 10).toFixed(1) }}折</span><span v-else>-</span></template></el-table-column>
            <el-table-column label="适用 SKU" width="180"><template #default="{ row }">{{ row.productSkuId ? (skuNameMap[row.productSkuId] || row.productSkuId) : '全部 SKU' }}</template></el-table-column>
            <el-table-column prop="agreementNo" label="协议编号" width="140" />
            <el-table-column label="有效期" width="220"><template #default="{ row }"><span v-if="row.agreementStart || row.agreementEnd">{{ row.agreementStart || '不限' }} ~ {{ row.agreementEnd || '不限' }}</span><span v-else>-</span></template></el-table-column>
            <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '启用' : '禁用' }}</el-tag></template></el-table-column>
            <el-table-column prop="salesRep" label="业务员" width="100" />
            <el-table-column label="操作" width="160"><template #default="{ row }"><el-button type="primary" link size="small" @click="openAgreementDialog(row)">编辑</el-button><el-button type="danger" link size="small" @click="handleDeleteAgreement(row.pricingId)">删除</el-button></template></el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="价格历史" name="history">
        <div class="tab-content">
          <div class="toolbar">
            <el-select v-model="historyFilter.skuId" placeholder="选择 SKU" clearable style="width: 300px" filterable>
              <el-option v-for="s in skuOptions" :key="s.skuId" :label="s.skuCode + ' (' + (s.skuName || '-') + ')'" :value="s.skuId" />
            </el-select>
            <el-select v-model="historyFilter.priceType" placeholder="价格类型" clearable style="width: 140px">
              <el-option label="成本价" value="cost" /><el-option label="统一零售价" value="retail" /><el-option label="最低售价" value="min" />
            </el-select>
            <el-button type="primary" @click="loadHistory">查询</el-button>
          </div>
          <el-table v-loading="historyLoading" :data="historyList" stripe highlight-current-row style="cursor: pointer" @row-dblclick="showHistoryDetail">
            <el-table-column label="SKU" min-width="220"><template #default="{ row }"><div><strong>{{ row.skuCode || row.skuId }}</strong><span v-if="row.skuName" style="color: #909399; margin-left: 6px">{{ row.skuName }}</span><div v-if="row.skuBarcode" style="color: #999; font-size: 11px">条码: {{ row.skuBarcode }}</div></div></template></el-table-column>
            <el-table-column label="价格类型" width="120"><template #default="{ row }"><el-tag :type="({ cost: 'warning', retail: 'success', min: 'info' } as Record<string, string>)[row.priceType] || 'info'" size="small">{{ ({ cost: '成本价', retail: '统一零售价', min: '最低售价' } as Record<string, string>)[row.priceType] || row.priceType }}</el-tag></template></el-table-column>
            <el-table-column prop="oldValue" label="原值" width="100"><template #default="{ row }">{{ row.oldValue !== null ? '¥' + Number(row.oldValue).toFixed(2) : '-' }}</template></el-table-column>
            <el-table-column prop="newValue" label="新值" width="100"><template #default="{ row }">¥{{ Number(row.newValue).toFixed(2) }}</template></el-table-column>
            <el-table-column prop="changeReason" label="变更原因" min-width="180" />
            <el-table-column prop="changedBy" label="操作人" width="100" />
            <el-table-column prop="changedAt" label="变更时间" width="180"><template #default="{ row }">{{ new Date(row.changedAt).toLocaleString('zh-CN') }}</template></el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="促销管理" name="promotions">
        <div class="tab-content">
          <div class="toolbar">
            <el-button type="success" @click="openPromoDialog()">新增促销</el-button>
          </div>
          <el-table v-loading="promoLoading" :data="promoList" stripe>
            <el-table-column prop="promotionCode" label="编码" width="120" />
            <el-table-column prop="name" label="名称" min-width="160" />
            <el-table-column label="类型" width="100"><template #default="{ row }"><el-tag size="small">{{ ({ discount: '折扣', flash_sale: '秒杀', bundle: '捆绑', coupon: '优惠券', member_exclusive: '会员专享' } as Record<string, string>)[row.type] || row.type }}</el-tag></template></el-table-column>
            <el-table-column label="优惠" width="120"><template #default="{ row }">{{ row.discountType === 'fixed_amount' ? '¥' + Number(row.discountValue).toFixed(2) : Number(row.discountValue) + '%' }}</template></el-table-column>
            <el-table-column label="适用范围" width="120"><template #default="{ row }">{{ ({ all: '全部', category: '按分类', spu: '按SPU', sku: '按SKU' } as Record<string, string>)[row.scope] || row.scope }}</template></el-table-column>
            <el-table-column label="使用量" width="140"><template #default="{ row }"><el-progress :percentage="getPromoUsagePercent(row)" :stroke-width="6" :status="getPromoUsageStatus(row)" style="width:100%" /><span style="font-size:10px;color:#909399">{{ row.usedCount || 0 }}/{{ row.totalLimit || '∞' }}</span></template></el-table-column>
            <el-table-column label="可叠加" width="80"><template #default="{ row }"><el-tag :type="row.stackable ? 'success' : 'info'" size="small">{{ row.stackable ? '是' : '否' }}</el-tag></template></el-table-column>
            <el-table-column label="有效期" width="200"><template #default="{ row }">{{ formatDate(row.startTime) }} ~ {{ formatDate(row.endTime) }}</template></el-table-column>
            <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="({ draft: 'info', active: 'success', paused: 'warning', expired: 'danger' } as Record<string, string>)[row.status]" size="small">{{ promoStatusLabel(row.status) }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="280"><template #default="{ row }"><el-button v-if="row.status === PROMOTION_STATUS.draft" type="success" link size="small" @click="handlePromoStatus(row, PROMOTION_STATUS.active)">启用</el-button><el-button v-if="row.status === PROMOTION_STATUS.active" type="warning" link size="small" @click="handlePromoStatus(row, PROMOTION_STATUS.paused)">暂停</el-button><el-button type="primary" link size="small" @click="openPromoDialog(row)">编辑</el-button><el-button type="info" link size="small" @click="handleCopyPromo(row)">复制</el-button><el-button type="danger" link size="small" @click="handleDeletePromo(row.promotionId)">删除</el-button></template></el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="会员定价" name="member-pricing">
        <div class="tab-content">
          <div class="toolbar">
            <el-select v-model="memberRuleFilter.levelCode" placeholder="筛选等级" clearable style="width: 140px" @change="loadMemberPricingRules">
              <el-option v-for="l in memberLevels" :key="l.levelCode" :label="l.levelName" :value="l.levelCode" />
            </el-select>
            <el-select v-model="memberRuleFilter.skuId" placeholder="选择 SKU" clearable filterable style="width: 300px" @change="loadMemberPricingRules">
              <el-option v-for="s in skuOptions" :key="s.skuId" :label="(s.skuCode || s.skuId) + ' ' + (s.skuName || '')" :value="s.skuId" />
            </el-select>
            <el-button type="primary" @click="loadMemberPricingRules">查询</el-button>
            <el-button type="success" @click="openMemberPricingRuleDialog()">新增规则</el-button>
          </div>
          <el-table v-loading="memberRulesLoading" :data="memberPricingRules" stripe highlight-current-row @row-dblclick="(row: Record<string, unknown>) => openMemberPricingRuleDialog(row)">
            <el-table-column prop="memberLevel?.levelName" label="等级" width="80" />
            <el-table-column prop="skuId" label="SKU" width="200" show-overflow-tooltip />
            <el-table-column label="规则类型" width="120"><template #default="{ row }"><el-tag :type="({ discount: '', fixed_price: 'danger', extra_discount: 'success' } as Record<string, string>)[row.ruleType] || 'info'" size="small">{{ ({ discount: '折扣率', fixed_price: '固定价', extra_discount: '额外折扣' } as Record<string, string>)[row.ruleType] }}</el-tag></template></el-table-column>
            <el-table-column label="规则值" width="140"><template #default="{ row }"><template v-if="row.ruleType === 'fixed_price' && row.fixedPrice">¥{{ Number(row.fixedPrice).toFixed(2) }}</template><template v-else-if="row.ruleType === 'discount' && row.discountRate">{{ (Number(row.discountRate) * 10).toFixed(1) }}折</template><template v-else-if="row.ruleType === 'extra_discount' && row.extraDiscount">{{ (Number(row.extraDiscount) * 10).toFixed(1) }}折叠加</template><template v-else>-</template></template></el-table-column>
            <el-table-column prop="priority" label="优先级" width="70" />
            <el-table-column label="状态" width="70"><template #default="{ row }"><el-tag :type="row.isActive ? 'success' : 'info'" size="small">{{ row.isActive ? '启用' : '禁用' }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="80" fixed="right"><template #default="{ row }"><el-popconfirm title="确认停用？" @confirm="handleDeleteMemberPricingRule(row.ruleId)"><template #reference><el-button link type="danger" size="small">停用</el-button></template></el-popconfirm></template></el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="tierDialogVisible" :title="tierForm.tierId ? '编辑分级' : '新增分级'" width="500px">
      <el-form :model="tierForm" label-width="100px">
        <el-form-item label="分级 Code"><el-input v-model="tierForm.tierCode" :disabled="!!tierForm.tierId" placeholder="如: color" /></el-form-item>
        <el-form-item label="分级名称"><el-input v-model="tierForm.tierName" placeholder="如: 色彩级" /></el-form-item>
        <el-form-item label="定位描述"><el-input v-model="tierForm.positioning" type="textarea" :rows="2" placeholder="如: 入门时尚，基础款多色可选" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="tierForm.sortOrder" :min="0" :max="99" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="tierDialogVisible = false">取消</el-button><el-button type="primary" @click="handleSaveTier">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="wholesaleDialogVisible" :title="wholesaleForm.tierId ? '编辑阶梯' : '新增阶梯'" width="500px">
      <el-form :model="wholesaleForm" label-width="100px">
        <el-form-item label="阶梯 Code"><el-input v-model="wholesaleForm.tierCode" :disabled="!!wholesaleForm.tierId" placeholder="如: A" /></el-form-item>
        <el-form-item label="阶梯名称"><el-input v-model="wholesaleForm.tierName" placeholder="如: A 档" /></el-form-item>
        <el-form-item label="最低起订量"><el-input-number v-model="wholesaleForm.minQuantity" :min="1" /></el-form-item>
        <el-form-item label="最高数量"><el-input-number v-model="wholesaleForm.maxQuantity" :min="1" /><span style="margin-left: 8px; color: #999; font-size: 12px">留空=无上限</span></el-form-item>
        <el-form-item label="折扣率"><el-slider v-model="wholesaleForm._discountDisplay" :min="10" :max="100" :step="5" show-stops style="flex: 1; margin-right: 12px" /><el-input-number v-model="wholesaleForm.discountRate" :precision="3" :min="0.1" :max="1" :step="0.05" style="width: 120px" /><span style="margin-left: 8px; color: #909399; font-size: 12px">{{ wholesaleForm.discountRate ? (wholesaleForm.discountRate * 10).toFixed(1) + '折' : '' }}</span></el-form-item>
        <el-form-item label="描述"><el-input v-model="wholesaleForm.description" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="wholesaleDialogVisible = false">取消</el-button><el-button type="primary" @click="handleSaveWholesale">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="agreementDialogVisible" :title="agreementForm.pricingId ? '编辑协议价' : '新增协议价'" width="600px">
      <el-form :model="agreementForm" label-width="110px">
        <el-form-item label="定价模式"><el-radio-group v-model="agreementForm.pricingMode"><el-radio value="fixed">固定价格</el-radio><el-radio value="discount">折扣率</el-radio></el-radio-group></el-form-item>
        <el-form-item v-if="agreementForm.pricingMode === 'fixed'" label="固定价格"><el-input-number v-model="agreementForm.fixedPrice" :precision="2" :min="0" :step="1" style="width: 200px" /><span style="margin-left: 8px; color: #999">元</span></el-form-item>
        <el-form-item v-if="agreementForm.pricingMode === 'discount'" label="折扣率"><el-slider v-model="agreementForm._discountDisplay" :min="10" :max="100" :step="5" show-stops style="flex: 1; margin-right: 12px" /><el-input-number v-model="agreementForm.discountRate" :precision="3" :min="0.1" :max="1" :step="0.05" style="width: 120px" /><span style="margin-left: 8px; color: #909399; font-size: 12px">{{ agreementForm.discountRate ? (agreementForm.discountRate * 10).toFixed(1) + '折' : '' }}</span></el-form-item>
        <el-form-item label="适用 SKU"><el-select v-model="agreementForm.productSkuId" placeholder="留空=全部 SKU" clearable style="width: 100%" filterable><el-option v-for="s in skuOptions" :key="s.skuId" :label="s.skuCode + ' (' + (s.skuName || '-') + ')'" :value="s.skuId" /></el-select></el-form-item>
        <el-form-item label="协议编号"><el-input v-model="agreementForm.agreementNo" placeholder="如: MIAOJING-2026-001" /></el-form-item>
        <el-form-item label="有效期"><el-date-picker v-model="agreementForm.agreementStart" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" style="width: 180px; margin-right: 8px" /><span>~</span><el-date-picker v-model="agreementForm.agreementEnd" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 180px; margin-left: 8px" /></el-form-item>
        <el-form-item label="业务员"><el-input v-model="agreementForm.salesRep" placeholder="负责业务员" style="width: 200px" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="agreementForm.isActive" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="agreementDialogVisible = false">取消</el-button><el-button type="primary" @click="handleSaveAgreement">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="historyDetailVisible" title="价格变更详情" width="620px" :close-on-click-modal="false">
      <template v-if="historyDetailRow">
        <el-descriptions :column="2" border size="large">
          <el-descriptions-item label="SKU 编码" :span="2"><strong>{{ historyDetailRow.skuCode || historyDetailRow.skuId }}</strong><span v-if="historyDetailRow.skuName" style="color: #909399; margin-left: 8px">{{ historyDetailRow.skuName }}</span></el-descriptions-item>
          <el-descriptions-item label="价格类型"><el-tag :type="({ cost: 'warning', retail: 'success', min: 'info' } as Record<string, string>)[historyDetailRow.priceType as string] || 'info'" size="small">{{ ({ cost: '成本价', retail: '统一零售价', min: '最低售价' } as Record<string, string>)[historyDetailRow.priceType as string] || historyDetailRow.priceType }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="变更幅度"><span v-if="historyDetailRow.oldValue !== null && historyDetailRow.oldValue !== undefined"><span style="color: #909399; text-decoration: line-through">¥{{ Number(historyDetailRow.oldValue).toFixed(2) }}</span><span style="margin: 0 8px">→</span><span :style="{ color: Number(historyDetailRow.newValue) > Number(historyDetailRow.oldValue) ? '#f56c6c' : '#67c23a', fontWeight: 'bold' }">¥{{ Number(historyDetailRow.newValue).toFixed(2) }}</span></span><span v-else><el-tag type="primary" size="small">首次定价</el-tag><span style="margin-left: 8px; font-weight: bold">¥{{ Number(historyDetailRow.newValue).toFixed(2) }}</span></span></el-descriptions-item>
          <el-descriptions-item label="操作人">{{ historyDetailRow.changedBy || '系统' }}</el-descriptions-item>
          <el-descriptions-item label="变更时间">{{ new Date(historyDetailRow.changedAt as string).toLocaleString('zh-CN') }}</el-descriptions-item>
          <el-descriptions-item label="变更原因" :span="2">{{ historyDetailRow.changeReason || '无' }}</el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer><el-button @click="historyDetailVisible = false">关闭</el-button></template>
    </el-dialog>

    <el-dialog v-model="promoDialogVisible" :title="promoForm.promotionId && !promoForm._isNew ? '编辑促销' : '新增促销'" width="650px">
      <el-form :model="promoForm" label-width="90px" size="small">
        <el-form-item label="促销编码"><el-input v-model="promoForm.promotionCode" :disabled="!!promoForm.promotionId && !promoForm._isNew" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="promoForm.name" /></el-form-item>
        <el-form-item label="类型"><el-select v-model="promoForm.type"><el-option label="折扣" value="discount" /><el-option label="秒杀" value="flash_sale" /><el-option label="捆绑" value="bundle" /><el-option label="优惠券" value="coupon" /><el-option label="会员专享" value="member_exclusive" /></el-select></el-form-item>
        <el-form-item label="适用范围"><el-select v-model="promoForm.scope"><el-option label="全部" value="all" /><el-option label="按分类" value="category" /><el-option label="按SPU" value="spu" /><el-option label="按SKU" value="sku" /></el-select></el-form-item>
        <el-form-item label="优惠类型"><el-radio-group v-model="promoForm.discountType"><el-radio value="percent">百分比</el-radio><el-radio value="fixed_amount">固定金额</el-radio></el-radio-group></el-form-item>
        <el-form-item :label="promoForm.discountType === 'fixed_amount' ? '优惠金额' : '折扣率(%)'"><el-input-number v-model="promoForm.discountValue" :min="1" :max="promoForm.discountType === 'fixed_amount' ? 9999 : 100" /></el-form-item>
        <el-form-item label="满减门槛"><el-input-number v-model="promoForm.minAmount" :min="0" :precision="2" /><span style="margin-left: 8px; color: #999; font-size: 12px">0=无门槛</span></el-form-item>
        <el-form-item label="有效期"><el-date-picker v-model="promoForm.startTime" type="date" placeholder="开始" value-format="YYYY-MM-DD" style="width: 160px; margin-right: 8px" /><span>~</span><el-date-picker v-model="promoForm.endTime" type="date" placeholder="结束" value-format="YYYY-MM-DD" style="width: 160px; margin-left: 8px" /></el-form-item>
        <el-form-item label="可叠加"><el-switch v-model="promoForm.stackable" /></el-form-item>
        <el-form-item label="使用限制"><el-input-number v-model="promoForm.totalLimit" :min="0" style="width: 120px" placeholder="总次数" /><span style="margin-left: 4px; color: #999; font-size: 12px">0=不限</span></el-form-item>
      </el-form>
      <template #footer><el-button @click="promoDialogVisible = false">取消</el-button><el-button type="primary" @click="handleSavePromo">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="memberPricingRuleDialogVisible" :title="memberPricingRuleForm.ruleId ? '编辑定价规则' : '新增定价规则'" width="560px">
      <el-form :model="memberPricingRuleForm" label-width="110px">
        <el-form-item label="会员等级"><el-select v-model="memberPricingRuleForm.levelCode" placeholder="选择等级" :disabled="!!memberPricingRuleForm.ruleId" style="width: 100%"><el-option v-for="l in memberLevels" :key="l.levelCode" :label="l.levelName + ' (' + (Number(l.discountRate) * 10).toFixed(1) + '折)'" :value="l.levelCode" /></el-select></el-form-item>
        <el-form-item label="适用 SKU"><el-select v-model="memberPricingRuleForm.skuId" placeholder="选择 SKU" :disabled="!!memberPricingRuleForm.ruleId" filterable style="width: 100%"><el-option v-for="s in skuOptions" :key="s.skuId" :label="(s.skuCode || s.skuId) + ' ' + (s.skuName || '')" :value="s.skuId" /></el-select></el-form-item>
        <el-form-item label="规则类型"><el-radio-group v-model="memberPricingRuleForm.ruleType"><el-radio value="discount">折扣率</el-radio><el-radio value="fixed_price">固定价</el-radio><el-radio value="extra_discount">额外折扣叠加</el-radio></el-radio-group></el-form-item>
        <el-form-item v-if="memberPricingRuleForm.ruleType === 'discount'" label="折扣率"><el-input-number v-model="memberPricingRuleForm.discountRate" :precision="3" :min="0.1" :max="1" :step="0.05" style="width: 160px" /><span style="margin-left: 8px; color: #999">{{ memberPricingRuleForm.discountRate ? (Number(memberPricingRuleForm.discountRate) * 10).toFixed(1) + '折' : '' }}</span></el-form-item>
        <el-form-item v-if="memberPricingRuleForm.ruleType === 'fixed_price'" label="固定价格"><el-input-number v-model="memberPricingRuleForm.fixedPrice" :precision="2" :min="0" style="width: 180px" /></el-form-item>
        <el-form-item v-if="memberPricingRuleForm.ruleType === 'extra_discount'" label="额外折扣"><el-input-number v-model="memberPricingRuleForm.extraDiscount" :precision="3" :min="0.5" :max="1" :step="0.05" style="width: 160px" /></el-form-item>
        <el-form-item label="优先级"><el-input-number v-model="memberPricingRuleForm.priority" :min="0" :max="99" style="width: 120px" /></el-form-item>
        <el-form-item label="起购量"><el-input-number v-model="memberPricingRuleForm.minQuantity" :min="1" :max="9999" style="width: 120px" /></el-form-item>
        <el-form-item label="生效时间"><el-date-picker v-model="memberPricingRuleForm.startTime" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" style="width: 180px; margin-right: 8px" /><span>~</span><el-date-picker v-model="memberPricingRuleForm.endTime" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 180px; margin-left: 8px" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="memberPricingRuleForm.notes" placeholder="规则说明" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="memberPricingRuleDialogVisible = false">取消</el-button><el-button type="primary" @click="handleSaveMemberPricingRule">保存</el-button></template>
    </el-dialog>
  </div>
</template>


<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDict } from '@/composables/useDict'
import {
  getTierPricings, createTierPricing, updateTierPricing, deleteTierPricing,
  getWholesaleTiers, createWholesaleTier, updateWholesaleTier, deleteWholesaleTier,
  getPriceHistory,
  getSkus,
  getPromotions, createPromotion, updatePromotion, deletePromotion, updatePromotionStatus,
} from '@/api/product'
import { getCustomerList, getTierPricings as getCustomerPricings, addTierPricing, updateTierPricing as updateCustomerPricing, deleteTierPricing as deleteCustomerPricing, getMemberPricingRules, createMemberPricingRule, updateMemberPricingRule, deleteMemberPricingRule } from '@/api/customer'

const PROMOTION_STATUS = { draft: 'draft', active: 'active', paused: 'paused', expired: 'expired' } as const
const promoStatusDict = useDict('dict_promotion_status')
const promoStatusLabel = (s: string) => (promoStatusDict?.labels?.value?.[s]) || { draft: '草稿', active: '进行中', paused: '已暂停', expired: '已过期' }[s] || s
const CUSTOMER_TYPES = ['retail', 'business', 'partner'] as const

const activeTab = ref('tiers')
const loadedTabs = ref(new Set<string>(['tiers', 'wholesale']))
const loadingTabs = ref(new Set<string>())

// ===== 分级定义 =====
interface TierForm { tierId: string; tierCode: string; tierName: string; positioning: string; sortOrder: number }
const tierList = ref<Record<string, unknown>[]>([])
const tierLoading = ref(false)
const tierDialogVisible = ref(false)
const selectedTiers = ref<Record<string, unknown>[]>([])
const tierForm = reactive<TierForm>({ tierId: '', tierCode: '', tierName: '', positioning: '', sortOrder: 0 })

const loadTiers = async () => { tierLoading.value = true; try { const res = await getTierPricings(); tierList.value = res as unknown as Record<string, unknown>[] } catch (e: unknown) { ElMessage.error('加载分级失败: ' + ((e as Error)?.message || String(e))) } finally { tierLoading.value = false } }
const openTierDialog = (row?: Record<string, unknown>) => { if (row) Object.assign(tierForm, { tierId: row.tierId, tierCode: row.tierCode, tierName: row.tierName, positioning: row.positioning || '', sortOrder: row.sortOrder }); else Object.assign(tierForm, { tierId: '', tierCode: '', tierName: '', positioning: '', sortOrder: tierList.value.length + 1 }); tierDialogVisible.value = true }
const handleSaveTier = async () => { try { if (tierForm.tierId) { await updateTierPricing(tierForm.tierId, { tierName: tierForm.tierName, positioning: tierForm.positioning, sortOrder: tierForm.sortOrder }); ElMessage.success('更新成功') } else { tierForm.tierId = 'tier-' + Date.now() + '-' + crypto.randomUUID().slice(0, 8); await createTierPricing({ ...tierForm, isActive: true }); ElMessage.success('创建成功') } tierDialogVisible.value = false; selectedTiers.value = []; await loadTiers() } catch (e: unknown) { ElMessage.error('保存失败: ' + ((e as Error)?.message || String(e))) } }
const handleDeleteTier = async (tierId: string) => { try { await deleteTierPricing(tierId); ElMessage.success('已删除'); await loadTiers() } catch (e: unknown) { ElMessage.error('删除失败: ' + ((e as Error)?.message || String(e))) } }
const batchDeleteTiers = async () => { try { await ElMessageBox.confirm('确认删除选中的 ' + selectedTiers.value.length + ' 个分级？（软删除）', '批量删除', { type: 'warning' }); for (const row of selectedTiers.value) { if (row.tierId) await handleDeleteTier(row.tierId as string) } selectedTiers.value = [] } catch (e: unknown) { if (e !== 'cancel') ElMessage.error('批量删除失败: ' + ((e as Error)?.message || String(e))) } }

// ===== 阶梯定价 =====
interface WholesaleForm { tierId: string; tierCode: string; tierName: string; minQuantity: number; maxQuantity: number | null; discountRate: number; description: string; _discountDisplay: number }
const wholesaleList = ref<Record<string, unknown>[]>([])
const wholesaleLoading = ref(false)
const wholesaleDialogVisible = ref(false)
const selectedWholesales = ref<Record<string, unknown>[]>([])
const wholesaleForm = reactive<WholesaleForm>({ tierId: '', tierCode: '', tierName: '', minQuantity: 1, maxQuantity: null, discountRate: 0.8, description: '', _discountDisplay: 80 })

const loadWholesale = async () => { wholesaleLoading.value = true; try { const res = await getWholesaleTiers(); wholesaleList.value = res as unknown as Record<string, unknown>[] } catch (e: unknown) { ElMessage.error('加载阶梯失败: ' + ((e as Error)?.message || String(e))) } finally { wholesaleLoading.value = false } }
const openWholesaleDialog = (row?: Record<string, unknown>) => { if (row) Object.assign(wholesaleForm, { ...row, _discountDisplay: Math.round((row.discountRate as number) * 100) }); else Object.assign(wholesaleForm, { tierId: '', tierCode: '', tierName: '', minQuantity: 1, maxQuantity: null, discountRate: 0.8, description: '', _discountDisplay: 80 }); wholesaleDialogVisible.value = true }
const handleSaveWholesale = async () => { try { if (wholesaleForm.tierId) { await updateWholesaleTier(wholesaleForm.tierId, { tierName: wholesaleForm.tierName, minQuantity: wholesaleForm.minQuantity, maxQuantity: wholesaleForm.maxQuantity || null, discountRate: wholesaleForm.discountRate, description: wholesaleForm.description }); ElMessage.success('更新成功') } else { wholesaleForm.tierId = 'wt-' + Date.now() + '-' + crypto.randomUUID().slice(0, 8); await createWholesaleTier({ tierId: wholesaleForm.tierId, tierCode: wholesaleForm.tierCode, tierName: wholesaleForm.tierName, minQuantity: wholesaleForm.minQuantity, maxQuantity: wholesaleForm.maxQuantity || null, discountRate: wholesaleForm.discountRate, description: wholesaleForm.description }); ElMessage.success('创建成功') } wholesaleDialogVisible.value = false; selectedWholesales.value = []; await loadWholesale() } catch (e: unknown) { const err = e instanceof Error ? e.message : String(e); ElMessage.error('保存失败: ' + err) } }
const batchDeleteWholesales = async () => { try { await ElMessageBox.confirm('确认删除选中的 ' + selectedWholesales.value.length + ' 个阶梯？（软删除）', '批量删除', { type: 'warning' }); for (const row of selectedWholesales.value) { if (row.tierId) await deleteWholesaleTier(row.tierId as string) } selectedWholesales.value = []; ElMessage.success('已删除'); await loadWholesale() } catch (e: unknown) { if (e !== 'cancel') ElMessage.error('批量删除失败: ' + ((e as Error)?.message || String(e))) } }

// ===== 协议价管理 =====
interface AgreementForm { pricingId: string; pricingMode: string; fixedPrice: number | null; discountRate: number; _discountDisplay: number; productSkuId: string; agreementNo: string; agreementStart: string | null; agreementEnd: string | null; salesRep: string; isActive: boolean }
const agreementList = ref<Record<string, unknown>[]>([])
const agreementLoading = ref(false)
const agreementDialogVisible = ref(false)
const agreementFilter = reactive({ customerId: '' })
const agreementForm = reactive<AgreementForm>({ pricingId: '', pricingMode: 'discount', fixedPrice: null, discountRate: 0.9, _discountDisplay: 90, productSkuId: '', agreementNo: '', agreementStart: null, agreementEnd: null, salesRep: '', isActive: true })
const businessCustomerOptions = ref<Record<string, unknown>[]>([])
const skuNameMap = ref<Record<string, string>>({})

const loadBusinessCustomers = async () => { try { const res = await getCustomerList({ page: 1, pageSize: 200, customerType: CUSTOMER_TYPES[1] }); const list = res.items || []; businessCustomerOptions.value = list.map((c) => ({ customerId: c.customerId, contactName: c.contactName, companyName: c.companyName, customerType: c.customerType })) } catch { /* ignore */ } }
const onAgreementCustomerChange = () => { loadAgreements() }
const loadAgreements = async () => { if (!agreementFilter.customerId) return; agreementLoading.value = true; try { const res = await getCustomerPricings(agreementFilter.customerId); agreementList.value = res as unknown as Record<string, unknown>[] } catch (e: unknown) { ElMessage.error('加载协议价失败: ' + ((e as Error)?.message || String(e))) } finally { agreementLoading.value = false } }
const openAgreementDialog = (row?: Record<string, unknown>) => { if (row) Object.assign(agreementForm, { ...row, _discountDisplay: row.discountRate ? Math.round((row.discountRate as number) * 100) : 90 }); else Object.assign(agreementForm, { pricingId: '', pricingMode: 'discount', fixedPrice: null, discountRate: 0.9, _discountDisplay: 90, productSkuId: '', agreementNo: '', agreementStart: null, agreementEnd: null, salesRep: '', isActive: true }); agreementDialogVisible.value = true }
const handleSaveAgreement = async () => { try { const payload = { pricingMode: agreementForm.pricingMode, fixedPrice: agreementForm.pricingMode === 'fixed' ? agreementForm.fixedPrice : null, discountRate: agreementForm.pricingMode === 'discount' ? agreementForm.discountRate : null, productSkuId: agreementForm.productSkuId || null, agreementNo: agreementForm.agreementNo || null, agreementStart: agreementForm.agreementStart || null, agreementEnd: agreementForm.agreementEnd || null, salesRep: agreementForm.salesRep || null, isActive: agreementForm.isActive }; if (agreementForm.pricingId) { await updateCustomerPricing(agreementForm.pricingId, payload); ElMessage.success('更新成功') } else { await addTierPricing({ customerId: agreementFilter.customerId, ...payload }); ElMessage.success('创建成功') } agreementDialogVisible.value = false; loadAgreements() } catch (e: unknown) { ElMessage.error('保存失败: ' + ((e as Error)?.message || String(e))) } }
const handleDeleteAgreement = async (id: string) => { try { await deleteCustomerPricing(id); ElMessage.success('已删除'); loadAgreements() } catch (e: unknown) { ElMessage.error('删除失败: ' + ((e as Error)?.message || String(e))) } }

// ===== 价格历史 =====
const historyList = ref<Record<string, unknown>[]>([])
const historyLoading = ref(false)
const historyFilter = reactive({ skuId: '', priceType: '' })
const skuOptions = ref<Record<string, unknown>[]>([])

const loadHistory = async () => { historyLoading.value = true; try { const res = await getPriceHistory(historyFilter) as unknown as Record<string, unknown>; historyList.value = (res?.data || res?.items || res || []) as Record<string, unknown>[] } catch (e: unknown) { ElMessage.error('加载价格历史失败: ' + ((e as Error)?.message || String(e))) } finally { historyLoading.value = false } }
const historyDetailVisible = ref(false)
const historyDetailRow = ref<Record<string, unknown> | null>(null)
const showHistoryDetail = (row: Record<string, unknown>) => { historyDetailRow.value = row; historyDetailVisible.value = true }

const loadSkuOptions = async () => { try { const res = await getSkus({ page: 1, pageSize: 200 }) as unknown as Record<string, unknown>; const list = (res?.items as unknown as Record<string, unknown>[]) || (res as unknown as Record<string, unknown>[]) || []; skuOptions.value = list.map((s) => ({ skuId: s.skuId, skuCode: s.skuCode, skuName: s.skuName })); list.forEach((s) => { if (s.skuId) skuNameMap.value[s.skuId as string] = String(s.skuCode) + (s.skuName ? ' (' + s.skuName + ')' : '') }) } catch { /* ignore */ } }

// ===== 促销管理 =====
interface PromoForm { promotionId: string; promotionCode: string; name: string; type: string; scope: string; scopeIds: string[]; discountType: string; discountValue: number; minAmount: number | null; maxDiscount: number | null; startTime: string; endTime: string; userLimit: number | null; totalLimit: number | null; priority: number; stackable: boolean; status: string; _isNew?: boolean }
const promoList = ref<Record<string, unknown>[]>([])
const promoLoading = ref(false)
const promoDialogVisible = ref(false)
const promoForm = reactive<PromoForm>({ promotionId: '', promotionCode: '', name: '', type: 'discount', scope: 'all', scopeIds: [], discountType: 'percent', discountValue: 10, minAmount: null, maxDiscount: null, startTime: '', endTime: '', userLimit: null, totalLimit: null, priority: 0, stackable: false, status: 'draft' })

const loadPromotions = async () => { promoLoading.value = true; try { const res = await getPromotions({}); promoList.value = res as unknown as Record<string, unknown>[] } catch (e: unknown) { ElMessage.error('加载促销失败: ' + ((e as Error)?.message || String(e))) } finally { promoLoading.value = false } }
const openPromoDialog = (row?: Record<string, unknown>) => { if (row) Object.assign(promoForm, { ...row, startTime: row.startTime ? new Date(row.startTime as string).toISOString().split('T')[0] : '', endTime: row.endTime ? new Date(row.endTime as string).toISOString().split('T')[0] : '' }); else Object.assign(promoForm, { promotionId: 'promo-' + Date.now(), promotionCode: '', name: '', type: 'discount', scope: 'all', scopeIds: [], discountType: 'percent', discountValue: 10, minAmount: null, maxDiscount: null, startTime: '', endTime: '', userLimit: null, totalLimit: null, priority: 0, stackable: false, status: 'draft' }); promoDialogVisible.value = true }
const handleSavePromo = async () => { try { if (promoForm.promotionId && !promoForm._isNew) { await updatePromotion(promoForm.promotionId, promoForm); ElMessage.success('更新成功') } else { await createPromotion(promoForm); ElMessage.success('创建成功') } promoDialogVisible.value = false; loadPromotions() } catch (e: unknown) { ElMessage.error('保存失败: ' + ((e as Error)?.message || String(e))) } }
const handleDeletePromo = async (id: string) => { try { await deletePromotion(id); ElMessage.success('已删除'); loadPromotions() } catch (e: unknown) { ElMessage.error('删除失败: ' + ((e as Error)?.message || String(e))) } }
const handlePromoStatus = async (row: Record<string, unknown>, status: string) => { try { await updatePromotionStatus(row.promotionId as string, status); ElMessage.success('状态已更新'); loadPromotions() } catch (e: unknown) { ElMessage.error('操作失败: ' + ((e as Error)?.message || String(e))) } }
const handleCopyPromo = (row: Record<string, unknown>) => { Object.assign(promoForm, { promotionId: 'promo-' + Date.now(), promotionCode: (row.promotionCode as string) || '', name: (row.name as string) + ' (副本)', type: (row.type as string) || 'discount', scope: (row.scope as string) || 'all', scopeIds: (row.scopeIds as string[]) || [], discountType: (row.discountType as string) || 'percent', discountValue: (row.discountValue as number) || 10, minAmount: (row.minAmount as number) || null, maxDiscount: (row.maxDiscount as number) || null, startTime: (row.startTime as string) || '', endTime: (row.endTime as string) || '', userLimit: (row.userLimit as number) || null, totalLimit: (row.totalLimit as number) || null, priority: (row.priority as number) || 0, stackable: Boolean(row.stackable), status: (row.status as string) || 'draft' }); promoDialogVisible.value = true }
const formatDate = (d: string) => d ? new Date(d).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'
const getPromoUsagePercent = (row: Record<string, unknown>) => (row.totalLimit as number) ? Math.round(((row.usedCount as number) || 0) / (row.totalLimit as number) * 100) : 0
const getPromoUsageStatus = (row: Record<string, unknown>) => { const pct = getPromoUsagePercent(row); if (pct >= 90) return 'exception'; if (pct >= 70) return 'warning'; return '' }

// ===== 会员定价规则 =====
const memberLevels = ref<Record<string, unknown>[]>([])
const memberPricingRules = ref<Record<string, unknown>[]>([])
const memberRulesLoading = ref(false)
const memberRuleFilter = reactive({ levelCode: '', skuId: '' })
const memberPricingRuleDialogVisible = ref(false)
interface MemberPricingRuleForm { ruleId: string; levelCode: string; skuId: string; ruleType: string; discountRate: number; fixedPrice: number | null; extraDiscount: number | null; priority: number; minQuantity: number; startTime: string | null; endTime: string | null; notes: string }
const memberPricingRuleForm = reactive<MemberPricingRuleForm>({ ruleId: '', levelCode: '', skuId: '', ruleType: 'discount', discountRate: 0.9, fixedPrice: null, extraDiscount: null, priority: 0, minQuantity: 1, startTime: null, endTime: null, notes: '' })

const loadMemberPricingRules = async () => { memberRulesLoading.value = true; try { const params: Record<string, string> = {}; if (memberRuleFilter.levelCode) params.levelCode = memberRuleFilter.levelCode; if (memberRuleFilter.skuId) params.skuId = memberRuleFilter.skuId; const res = await getMemberPricingRules(params); memberPricingRules.value = res as unknown as Record<string, unknown>[] } catch { memberPricingRules.value = [] } finally { memberRulesLoading.value = false } }
const openMemberPricingRuleDialog = (row?: Record<string, unknown>) => { if (row) Object.assign(memberPricingRuleForm, { ruleId: row.ruleId as string, levelCode: row.levelCode as string, skuId: row.skuId as string, ruleType: row.ruleType as string, discountRate: row.discountRate as number, fixedPrice: row.fixedPrice as number | null, extraDiscount: row.extraDiscount as number | null, priority: row.priority as number, minQuantity: (row.minQuantity as number) || 1, startTime: (row.startTime as string)?.split('T')[0] || null, endTime: (row.endTime as string)?.split('T')[0] || null, notes: (row.notes as string) || '' }); else Object.assign(memberPricingRuleForm, { ruleId: '', levelCode: memberRuleFilter.levelCode || '', skuId: memberRuleFilter.skuId || '', ruleType: 'discount', discountRate: 0.9, fixedPrice: null, extraDiscount: null, priority: 0, minQuantity: 1, startTime: null, endTime: null, notes: '' }); memberPricingRuleDialogVisible.value = true }
const handleSaveMemberPricingRule = async () => { try { if (memberPricingRuleForm.ruleId) { await updateMemberPricingRule(memberPricingRuleForm.ruleId, memberPricingRuleForm); ElMessage.success('更新成功') } else { await createMemberPricingRule(memberPricingRuleForm); ElMessage.success('创建成功') } memberPricingRuleDialogVisible.value = false; loadMemberPricingRules() } catch (e: unknown) { ElMessage.error('保存失败: ' + ((e as Error)?.message || String(e))) } }
const handleDeleteMemberPricingRule = async (ruleId: string) => { try { await deleteMemberPricingRule(ruleId); ElMessage.success('已停用'); loadMemberPricingRules() } catch (e: unknown) { ElMessage.error('操作失败: ' + ((e as Error)?.message || String(e))) } }

// ===== 生命周期 =====
onMounted(() => { loadTiers(); loadWholesale(); loadSkuOptions(); loadBusinessCustomers() })

const onTabChange = async (tab: { props?: { name?: string }; name?: string }) => {
  const tabName = tab.props?.name || tab.name
  if (!tabName) return
  if (loadedTabs.value.has(tabName) || loadingTabs.value.has(tabName)) return
  loadingTabs.value.add(tabName)
  try {
    switch (tabName) {
      case 'history': await loadHistory(); break
      case 'agreement': if (agreementFilter.customerId) await loadAgreements(); break
      case 'promotions': await loadPromotions(); break
      case 'member-pricing': await loadMemberPricingRules(); break
    }
    loadedTabs.value.add(tabName)
  } finally { loadingTabs.value.delete(tabName) }
}
</script>
