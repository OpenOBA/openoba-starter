<template>
  <div class="customer-page">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>客户管理</span>
          <el-button type="primary" @click="openDialog()">新增客户</el-button>
        </div>
      </template>

      <!-- 筛选 -->
      <el-form :inline="true" :model="query" class="filter-form">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="客户编号/姓名/企业/电话" clearable style="width: 200px" @keyup.enter="loadData" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="query.customerType" placeholder="全部" clearable style="width: 120px" :options="dictTypeOptions" @change="loadData" />
        </el-form-item>
        <!-- ✅ F3: 等级筛选器改为字典动态渲染 -->
        <el-form-item label="等级">
          <el-select v-model="query.customerLevel" placeholder="全部" clearable style="width: 100px" :options="dictLevelOptions" @change="loadData" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 100px" :options="dictStatusOptions" @change="loadData" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 工具栏 -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px">
        <div>
          <el-button type="primary" size="small" :disabled="selectedRows.length === 0" @click="batchEdit">编辑</el-button>
          <el-popconfirm title="确认批量软删除所选客户？" @confirm="batchDelete" :disabled="selectedRows.length === 0">
            <template #reference>
              <el-button type="danger" size="small" :disabled="selectedRows.length === 0">批量删除</el-button>
            </template>
          </el-popconfirm>
          <span v-if="selectedRows.length > 0" style="margin-left: 8px; color: #909399; font-size: 13px">
            已选 {{ selectedRows.length }} 条
          </span>
        </div>
      </div>

      <!-- 表格 -->
      <el-table
        :data="tableData" stripe border v-loading="loading" style="margin-top: 8px"
        @row-dblclick="openDetail" :row-style="{ cursor: 'pointer' }"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="45" fixed />
        <el-table-column prop="customerCode" label="客户编号" width="140" fixed />
        <el-table-column prop="contactName" label="联系人" width="90" />
        <el-table-column prop="nickname" label="昵称" width="90" show-overflow-tooltip />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="typeTag(row.customerType)" size="small">{{ typeLabel(row.customerType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="等级" width="80">
          <template #default="{ row }">
            <el-tag :type="levelTag(row.customerLevel)" size="small" effect="dark">{{ levelLabel(row.customerLevel) || 'NOR' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="companyName" label="企业名称" width="150" show-overflow-tooltip />
        <el-table-column prop="wechatId" label="微信号" width="100" />
        <el-table-column prop="phone" label="电话" width="120" />
        <el-table-column prop="preferredStyle" label="偏好风格" width="100" show-overflow-tooltip />
        <el-table-column prop="totalOrders" label="订单" width="60" align="right" />
        <el-table-column prop="totalAmount" label="累计消费" width="100" align="right">
          <template #default="{ row }">¥{{ Number(row.totalAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="70">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="loadData"
        @size-change="loadData"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑客户' : '新增客户'" width="720px" destroy-on-close>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row v-if="isEdit" :gutter="16">
          <el-col :span="12">
            <el-form-item label="客户编号">
              <el-input v-model="form.customerCode" disabled />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="客户类型" prop="customerType">
              <el-select v-model="form.customerType" placeholder="选择类型" style="width: 100%" :options="dictTypeOptions" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户等级">
              <el-select v-model="form.customerLevel" style="width: 100%" :options="dictLevelOptions" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="联系人" prop="contactName">
              <el-input v-model="form.contactName" placeholder="联系人姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="昵称">
              <el-input v-model="form.nickname" placeholder="昵称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="电话" prop="phone">
              <el-input v-model="form.phone" placeholder="联系电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="微信号">
              <el-input v-model="form.wechatId" placeholder="微信号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="企业名称">
          <el-input v-model="form.companyName" placeholder="企业名称（B端/partner 可选）" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="邮箱">
              <el-input v-model="form.email" placeholder="电子邮箱" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="来源渠道">
              <el-select v-model="form.referralSource" placeholder="选择来源" clearable style="width: 100%" :options="dictReferralOptions" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="省份">
              <el-input v-model="form.province" placeholder="省份" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="城市">
              <el-input v-model="form.city" placeholder="城市" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width: 100%" :options="dictStatusOptions" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地址">
          <el-input v-model="form.address" type="textarea" :rows="2" placeholder="详细地址" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="偏好风格">
              <el-input v-model="form.preferredStyle" placeholder="如：复古/商务/时尚" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="订阅状态">
              <el-select v-model="form.subscriptionStatus" clearable style="width: 100%" :options="dictSubscriptionOptions" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- ========== 详情抽屉 — Tab 布局 ========== -->
    <el-drawer v-model="detailVisible" :title="'客户详情 — ' + (detail?.contactName || '')" size="900px">
      <template v-if="detail">
        <!-- C 端：完整 Tab 布局 -->
        <el-tabs v-if="detail.customerType === 'retail'" v-model="activeTab" @tab-click="onTabClick">
          <!-- Tab 1: 基本信息 -->
          <el-tab-pane label="基本信息" name="basic">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="客户编号">{{ detail.customerCode }}</el-descriptions-item>
              <el-descriptions-item label="昵称">{{ detail.nickname || '—' }}</el-descriptions-item>
              <el-descriptions-item label="联系人">{{ detail.contactName }}</el-descriptions-item>
              <el-descriptions-item label="电话">{{ detail.phone }}</el-descriptions-item>
              <el-descriptions-item label="类型">
                <el-tag :type="typeTag(detail.customerType)" size="small">{{ typeLabel(detail.customerType) }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="等级">
                <el-tag :type="levelTag(detail.customerLevel)" size="small" effect="dark">{{ detail.customerLevel?.toUpperCase() }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="邮箱">{{ detail.email || '—' }}</el-descriptions-item>
              <el-descriptions-item label="微信">{{ detail.wechatId || '—' }}</el-descriptions-item>
              <el-descriptions-item label="来源渠道">{{ referralLabel(detail.referralSource) }}</el-descriptions-item>
              <el-descriptions-item label="偏好风格">{{ detail.preferredStyle || '—' }}</el-descriptions-item>
              <el-descriptions-item label="订阅状态">{{ subscriptionLabel(detail.subscriptionStatus) }}</el-descriptions-item>
              <el-descriptions-item label="城市">{{ detail.province ? detail.province + ' ' + detail.city : detail.city || '—' }}</el-descriptions-item>
              <el-descriptions-item label="累计订单">{{ detail.totalOrders || 0 }}</el-descriptions-item>
              <el-descriptions-item label="累计消费">¥{{ Number(detail.totalAmount || 0).toFixed(2) }}</el-descriptions-item>
              <el-descriptions-item label="最后联系">{{ detail.lastContactAt || '—' }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ detail.createdAt }}</el-descriptions-item>
              <el-descriptions-item label="备注" :span="2">{{ detail.notes || '—' }}</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <!-- Tab 2: 地址管理 -->
          <el-tab-pane label="地址管理" name="address">
            <el-table :data="addresses" size="small" border style="margin-bottom: 12px">
              <el-table-column prop="addressType" label="类型" width="80">
                <template #default="{ row }">{{ addrTypeLabel(row.addressType) }}</template>
              </el-table-column>
              <el-table-column prop="province" label="省份" width="70" />
              <el-table-column prop="city" label="城市" width="80" />
              <el-table-column prop="detailAddress" label="详细地址" show-overflow-tooltip />
              <el-table-column prop="receiverName" label="收件人" width="80" />
              <el-table-column prop="receiverPhone" label="电话" width="110" />
              <el-table-column label="默认" width="60">
                <template #default="{ row }">{{ row.isDefault ? '默认' : '' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="openEditAddress(row)">编辑</el-button>
                  <el-popconfirm title="确认删除此地址？" @confirm="handleDeleteAddress(row.addressId)">
                    <template #reference><el-button link type="danger" size="small">删除</el-button></template>
                  </el-popconfirm>
                </template>
              </el-table-column>
            </el-table>
            <el-button size="small" @click="openAddressDialog()">+ 添加地址</el-button>
          </el-tab-pane>

          <!-- Tab 3: 验光处方 -->
          <el-tab-pane label="验光处方" name="prescription">
            <el-table :data="prescriptions" size="small" border style="margin-bottom: 12px">
              <el-table-column prop="label" label="标签" width="120" />
              <el-table-column label="右眼(OD)" width="200">
                <template #default="{ row }">
                  S:{{ row.odSphere || '—' }} C:{{ row.odCylinder || '—' }} A:{{ row.odAxis || '—' }}
                  <span v-if="row.odAdd">ADD:{{ row.odAdd }}</span>
                </template>
              </el-table-column>
              <el-table-column label="左眼(OS)" width="200">
                <template #default="{ row }">
                  S:{{ row.osSphere || '—' }} C:{{ row.osCylinder || '—' }} A:{{ row.osAxis || '—' }}
                  <span v-if="row.osAdd">ADD:{{ row.osAdd }}</span>
                </template>
              </el-table-column>
              <el-table-column label="瞳距" width="70">
                <template #default="{ row }">{{ row.pdValue || '—' }}</template>
              </el-table-column>
              <el-table-column label="来源" width="100">
                <template #default="{ row }">{{ sourceTypeLabel(row.sourceType) }}</template>
              </el-table-column>
              <el-table-column label="处方日期" width="110">
                <template #default="{ row }">{{ row.prescriptionDate || '—' }}</template>
              </el-table-column>
              <el-table-column label="过期日期" width="110">
                <template #default="{ row }">
                  <el-tag :type="isExpired(row.expireDate) ? 'danger' : 'success'" size="small">
                    {{ row.expireDate || '长期有效' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80" fixed="right">
                <template #default="{ row }">
                  <el-popconfirm title="确认删除此处方？" @confirm="handleDeletePrescription(row.prescriptionId)">
                    <template #reference><el-button link type="danger" size="small">删除</el-button></template>
                  </el-popconfirm>
                </template>
              </el-table-column>
            </el-table>
            <el-button size="small" @click="openPrescriptionDialog()">+ 添加处方</el-button>
          </el-tab-pane>

          <!-- Tab 4: 在用结构标准 -->
          <el-tab-pane label="在用结构标准" name="structure">
            <el-descriptions :column="3" size="small" border style="margin-bottom: 12px">
              <el-descriptions-item label="镜片总数">{{ lensSummary?.total || customerLenses.length || 0 }}</el-descriptions-item>
              <el-descriptions-item label="在用">{{ lensSummary?.active || customerLenses.filter(l => l.status === 'active').length || 0 }}</el-descriptions-item>
              <el-descriptions-item label="已停用">{{ (lensSummary?.total || customerLenses.length) - (lensSummary?.active || customerLenses.filter(l => l.status === 'active').length) || 0 }}</el-descriptions-item>
            </el-descriptions>
            <el-table :data="customerLenses" size="small" border style="margin-bottom: 12px">
              <el-table-column prop="lensStandardCode" label="结构标准" width="120" />
              <el-table-column label="状态" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                    {{ row.status === 'active' ? '在用' : '停用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="关联处方" width="100">
                <template #default="{ row }">
                  <span v-if="row.prescriptionId">已关联</span>
                  <span v-else style="color: #999">未关联</span>
                </template>
              </el-table-column>
              <el-table-column label="购买日期" width="110">
                <template #default="{ row }">{{ row.purchaseDate || '—' }}</template>
              </el-table-column>
              <el-table-column label="来源订单" width="140">
                <template #default="{ row }">{{ row.orderId || '—' }}</template>
              </el-table-column>
              <el-table-column label="创建时间" width="160">
                <template #default="{ row }">{{ row.createdAt }}</template>
              </el-table-column>
              <el-table-column label="操作" width="80" fixed="right">
                <template #default="{ row }">
                  <el-popconfirm title="确认删除此镜片记录？" @confirm="handleDeleteLens(row.customerLensId)">
                    <template #reference><el-button link type="danger" size="small">删除</el-button></template>
                  </el-popconfirm>
                </template>
              </el-table-column>
            </el-table>
            <el-button size="small" @click="openLensDialog()">+ 添加镜片</el-button>
          </el-tab-pane>

          <!-- Tab 5: 消费记录 -->
          <el-tab-pane label="消费记录" name="orders">
            <el-table :data="customerOrders" size="small" border v-loading="ordersLoading" style="margin-bottom: 12px">
              <el-table-column prop="orderNo" label="订单号" width="160" />
              <el-table-column label="状态" width="80">
                <template #default="{ row }">
                  <el-tag :type="orderStatusTag(row.status)" size="small">{{ orderStatusLabel(row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="商品数" width="60" align="center">
                <template #default="{ row }">{{ row.items?.length || 0 }}</template>
              </el-table-column>
              <el-table-column label="订单金额" width="100" align="right">
                <template #default="{ row }">¥{{ Number(row.totalAmount || 0).toFixed(2) }}</template>
              </el-table-column>
              <el-table-column label="创建时间" width="160">
                <template #default="{ row }">{{ row.createdAt }}</template>
              </el-table-column>
            </el-table>
            <el-pagination
              v-if="orderTotal > 0"
              v-model:current-page="orderPage"
              :page-size="10"
              :total="orderTotal"
              layout="prev, pager, next"
              small
              @current-change="loadCustomerOrders"
              style="justify-content: flex-end"
            />
            <el-empty v-if="!ordersLoading && customerOrders.length === 0" description="暂无消费记录" :image-size="80" />
          </el-tab-pane>

          <!-- Tab 6: 官网账户 -->
          <el-tab-pane label="官网账户" name="account">
            <!-- 未注册时显示快捷入口 -->
            <el-empty v-if="!websiteAccount" description="该客户尚未注册官网账户" :image-size="80">
              <el-button type="primary" size="small" @click="handleRegisterAccount" :loading="accountLoading">
                一键注册官网账户
              </el-button>
            </el-empty>

            <!-- 已注册：账户管理面板 -->
            <template v-if="websiteAccount">
              <!-- 状态卡片 -->
              <el-card shadow="never" style="margin-bottom: 16px; background: #fafafa">
                <el-row :gutter="16" align="middle">
                  <el-col :span="12">
                    <div style="display: flex; align-items: center; gap: 12px">
                      <el-avatar :size="40" style="background: #409eff">
                        {{ websiteAccount.contactName?.charAt(0) || '用' }}
                      </el-avatar>
                      <div>
                        <div style="font-size: 16px; font-weight: 600">{{ websiteAccount.contactName }}</div>
                        <div style="font-size: 12px; color: #909399">{{ websiteAccount.phone }}</div>
                      </div>
                    </div>
                  </el-col>
                  <el-col :span="12" style="text-align: right">
                    <el-tag :type="statusType(websiteAccount.accountStatus)" size="large" effect="dark">
                      {{ accountLabel(websiteAccount.accountStatus) }}
                    </el-tag>
                  </el-col>
                </el-row>
              </el-card>

              <!-- 操作按钮组 -->
              <el-card shadow="never" style="margin-bottom: 16px">
                <template #header><span style="font-weight: 600">账户操作</span></template>
                <el-row :gutter="12">
                  <el-col :span="8">
                    <el-button style="width: 100%" @click="handleResetPassword" :loading="accountLoading" type="warning" plain>
                      重置密码
                    </el-button>
                  </el-col>
                  <el-col :span="8">
                    <el-button style="width: 100%" @click="handleSendLoginCode" :loading="accountLoading" type="primary" plain>
                      发送登录验证码
                    </el-button>
                  </el-col>
                  <el-col :span="8">
                    <el-dropdown trigger="click" @command="handleStatusChange">
                      <el-button style="width: 100%" plain>
                        切换状态
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item command="active">激活</el-dropdown-item>
                          <el-dropdown-item command="inactive">⏸️ 未激活</el-dropdown-item>
                          <el-dropdown-item command="suspended">冻结</el-dropdown-item>
                          <el-dropdown-item command="deactivated">注销</el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </el-col>
                </el-row>
              </el-card>

              <!-- 账户信息 -->
              <el-descriptions :column="2" border size="small" style="margin-bottom: 16px">
                <el-descriptions-item label="客户编号">{{ websiteAccount.customerCode }}</el-descriptions-item>
                <el-descriptions-item label="密码状态">
                  <el-tag :type="websiteAccount.hasPassword ? 'success' : 'warning'" size="small">
                    {{ websiteAccount.hasPassword ? '已设置（6 位 PIN）' : '未设置' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="注册时间">{{ websiteAccount.registeredAt || '—' }}</el-descriptions-item>
                <el-descriptions-item label="最后登录">{{ websiteAccount.lastLoginAt || '—' }}</el-descriptions-item>
                <el-descriptions-item label="累计订单">{{ websiteAccount.totalOrders || 0 }}</el-descriptions-item>
                <el-descriptions-item label="累计消费">¥{{ Number(websiteAccount.totalAmount || 0).toFixed(2) }}</el-descriptions-item>
                <el-descriptions-item label="积分余额">{{ websiteAccount.pointsBalance || 0 }}</el-descriptions-item>
                <el-descriptions-item label="会员折扣">{{ websiteAccount.memberDiscountRate }} 折</el-descriptions-item>
                <el-descriptions-item label="订阅状态">{{ subscriptionLabel(websiteAccount.subscriptionStatus) }}</el-descriptions-item>
                <el-descriptions-item label="会员身份">{{ memberLabel(websiteAccount.memberSince, websiteAccount.memberValidUntil) }}</el-descriptions-item>
              </el-descriptions>

              <!-- 登录日志 -->
              <el-card shadow="never">
                <template #header>
                  <div style="display: flex; justify-content: space-between; align-items: center">
                    <span style="font-weight: 600">登录记录</span>
                    <el-button size="small" @click="loadLoginLogs" :loading="loginLogsLoading">刷新</el-button>
                  </div>
                </template>
                <el-table :data="loginLogs" size="small" border max-height="300" v-loading="loginLogsLoading" empty-text="暂无登录记录">
                  <el-table-column label="时间" width="170">
                    <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
                  </el-table-column>
                  <el-table-column label="方式" width="100">
                    <template #default="{ row }">
                      <el-tag :type="row.loginMethod === 'sms_code' ? 'primary' : 'info'" size="small">
                        {{ row.loginMethod === 'sms_code' ? '验证码登录' : '密码登录' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="结果" width="80">
                    <template #default="{ row }">
                      <el-tag :type="row.loginResult === 'success' ? 'success' : 'danger'" size="small">
                        {{ row.loginResult === 'success' ? '成功' : '失败' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="失败原因" show-overflow-tooltip>
                    <template #default="{ row }">{{ row.failReason || '—' }}</template>
                  </el-table-column>
                  <el-table-column label="IP" width="140">
                    <template #default="{ row }">{{ row.ipAddress || '—' }}</template>
                  </el-table-column>
                </el-table>
              </el-card>
            </template>
          </el-tab-pane>

          <!-- Tab 7: 会员等级 -->
          <el-tab-pane label="会员等级" name="member">
            <!-- 会员信息卡片 -->
            <el-card shadow="never" style="margin-bottom: 16px; background: #fafafa">
              <el-row :gutter="16">
                <el-col :span="6">
                  <div class="member-stat">
                    <div class="member-stat-value">
                      <el-tag :type="levelTag(detail.customerLevel)" effect="dark" size="large">
                        {{ detail.customerLevel?.toUpperCase() || 'NOR' }}
                      </el-tag>
                    </div>
                    <div class="member-stat-label">当前等级</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="member-stat">
                    <div class="member-stat-value">¥{{ Number(detail.totalAmount || 0).toFixed(2) }}</div>
                    <div class="member-stat-label">累计消费</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="member-stat">
                    <div class="member-stat-value">{{ detail.pointsBalance || 0 }} 分</div>
                    <div class="member-stat-label">积分余额</div>
                  </div>
                </el-col>
                <el-col :span="6">
                  <div class="member-stat">
                    <div class="member-stat-value">{{ nextLevelInfo }}</div>
                    <div class="member-stat-label">距下一级</div>
                  </div>
                </el-col>
              </el-row>
              <el-divider style="margin: 12px 0" />
              <el-progress
                :percentage="upgradeProgress"
                :stroke-width="8"
                :status="upgradeProgress >= 100 ? 'success' : ''"
              />
              <div style="margin-top: 8px; color: #909399; font-size: 12px">
                成为会员: {{ detail.memberSince || '—' }} &nbsp;|&nbsp; 最后活跃: {{ detail.lastActiveAt || '—' }} &nbsp;|&nbsp; 有效期至: {{ detail.memberValidUntil || '—' }}
              </div>
            </el-card>

            <!-- 等级变更日志 -->
            <h4 style="margin: 12px 0 8px">等级变更记录</h4>
            <el-table :data="memberLevelLogs" size="small" border>
              <el-table-column label="变更" width="140">
                <template #default="{ row }">
                  <el-tag size="small" type="info">{{ row.oldLevel?.toUpperCase() }}</el-tag>
                  → <el-tag size="small" type="success">{{ row.newLevel?.toUpperCase() }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="触发类型" width="100">
                <template #default="{ row }">
                  <el-tag :type="triggerTypeTag(row.triggerType)" size="small">{{ triggerTypeLabel(row.triggerType) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="triggerReason" label="原因" show-overflow-tooltip />
              <el-table-column label="时间" width="160">
                <template #default="{ row }">{{ row.createdAt }}</template>
              </el-table-column>
            </el-table>
            <el-empty v-if="memberLevelLogs.length === 0" description="暂无等级变更记录" :image-size="60" />

            <!-- 积分流水 -->
            <h4 style="margin: 16px 0 8px">积分流水（最近50条）</h4>
            <el-table :data="pointsTransactions" size="small" border>
              <el-table-column label="积分" width="80" align="right">
                <template #default="{ row }">
                  <span :style="{ color: row.points > 0 ? '#67C23A' : '#F56C6C', fontWeight: 'bold' }">
                    {{ row.points > 0 ? '+' : '' }}{{ row.points }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="变更后余额" width="100" align="right">
                <template #default="{ row }">{{ row.balanceAfter }}</template>
              </el-table-column>
              <el-table-column label="类型" width="120">
                <template #default="{ row }">
                  <el-tag :type="pointsTypeTag(row.type)" size="small">{{ pointsTypeLabel(row.type) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="description" label="描述" show-overflow-tooltip />
              <el-table-column label="时间" width="160">
                <template #default="{ row }">{{ row.createdAt }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>

        <!-- B 端/partner：简化 Tab 布局 -->
        <el-tabs v-else v-model="activeTab" @tab-click="onTabClick">
          <el-tab-pane label="基本信息" name="basic">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="客户编号">{{ detail.customerCode }}</el-descriptions-item>
              <el-descriptions-item label="联系人">{{ detail.contactName }}</el-descriptions-item>
              <el-descriptions-item label="类型">
                <el-tag :type="typeTag(detail.customerType)" size="small">{{ typeLabel(detail.customerType) }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="等级">
                <el-tag :type="levelTag(detail.customerLevel)" size="small" effect="dark">{{ detail.customerLevel?.toUpperCase() }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="企业名称" :span="2">{{ detail.companyName || '—' }}</el-descriptions-item>
              <el-descriptions-item label="电话">{{ detail.phone }}</el-descriptions-item>
              <el-descriptions-item label="邮箱">{{ detail.email || '—' }}</el-descriptions-item>
              <el-descriptions-item label="城市">{{ detail.province ? detail.province + ' ' + detail.city : detail.city || '—' }}</el-descriptions-item>
              <el-descriptions-item label="累计订单">{{ detail.totalOrders || 0 }}</el-descriptions-item>
              <el-descriptions-item label="累计消费">¥{{ Number(detail.totalAmount || 0).toFixed(2) }}</el-descriptions-item>
              <el-descriptions-item label="备注" :span="2">{{ detail.notes || '—' }}</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
          <el-tab-pane label="联系人" name="contacts">
            <el-table :data="contacts" size="small" border style="margin-bottom: 12px">
              <el-table-column prop="contactName" label="姓名" width="100" />
              <el-table-column prop="role" label="角色" width="100" />
              <el-table-column prop="phone" label="电话" width="130" />
              <el-table-column prop="email" label="邮箱" show-overflow-tooltip />
              <el-table-column label="主要" width="60">
                <template #default="{ row }">{{ row.isPrimary ? '主地址' : '' }}</template>
              </el-table-column>
            </el-table>
            <el-button size="small" @click="openContactDialog()">+ 添加联系人</el-button>
          </el-tab-pane>
          <el-tab-pane label="地址" name="address">
            <el-table :data="addresses" size="small" border style="margin-bottom: 12px">
              <el-table-column prop="addressType" label="类型" width="80">
                <template #default="{ row }">{{ addrTypeLabel(row.addressType) }}</template>
              </el-table-column>
              <el-table-column prop="province" label="省份" width="70" />
              <el-table-column prop="city" label="城市" width="80" />
              <el-table-column prop="detailAddress" label="详细地址" show-overflow-tooltip />
              <el-table-column prop="receiverName" label="收件人" width="80" />
              <el-table-column prop="receiverPhone" label="电话" width="110" />
              <el-table-column label="默认" width="60">
                <template #default="{ row }">{{ row.isDefault ? '默认' : '' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="openEditAddress(row)">编辑</el-button>
                  <el-popconfirm title="确认删除此地址？" @confirm="handleDeleteAddress(row.addressId)">
                    <template #reference><el-button link type="danger" size="small">删除</el-button></template>
                  </el-popconfirm>
                </template>
              </el-table-column>
            </el-table>
            <el-button size="small" @click="openAddressDialog()">+ 添加地址</el-button>
          </el-tab-pane>
          <el-tab-pane label="阶梯定价" name="pricing">
            <el-table :data="tierPricings" size="small" border style="margin-bottom: 12px">
              <el-table-column prop="tierName" label="档位" width="100" />
              <el-table-column prop="minQty" label="最小数量" width="90" />
              <el-table-column prop="maxQty" label="最大数量" width="90" />
              <el-table-column prop="discountRate" label="折扣率" width="80">
                <template #default="{ row }">{{ (row.discountRate * 100).toFixed(0) }}%</template>
              </el-table-column>
              <el-table-column prop="notes" label="备注" show-overflow-tooltip />
            </el-table>
            <el-button size="small" @click="openTierPricingDialog()">+ 添加定价</el-button>
          </el-tab-pane>
          <!-- B端/合作商官网账户 Tab -->
          <el-tab-pane label="官网账户" name="account">
            <el-empty v-if="!websiteAccount" description="该客户尚未注册官网账户" :image-size="80">
              <el-button type="primary" size="small" @click="handleRegisterAccount" :loading="accountLoading">
                一键注册官网账户
              </el-button>
            </el-empty>
            <template v-if="websiteAccount">
              <el-card shadow="never" style="margin-bottom: 16px; background: #fafafa">
                <el-row :gutter="16" align="middle">
                  <el-col :span="12">
                    <div style="display: flex; align-items: center; gap: 12px">
                      <el-avatar :size="40" style="background: #409eff">{{ websiteAccount.contactName?.charAt(0) || '用' }}</el-avatar>
                      <div>
                        <div style="font-size: 16px; font-weight: 600">{{ websiteAccount.contactName }}</div>
                        <div style="font-size: 12px; color: #909399">{{ websiteAccount.phone }}</div>
                      </div>
                    </div>
                  </el-col>
                  <el-col :span="12" style="text-align: right">
                    <el-tag :type="statusType(websiteAccount.accountStatus)" size="large" effect="dark">{{ accountLabel(websiteAccount.accountStatus) }}</el-tag>
                  </el-col>
                </el-row>
              </el-card>
              <el-card shadow="never" style="margin-bottom: 16px">
                <template #header><span style="font-weight: 600">账户操作</span></template>
                <el-row :gutter="12">
                  <el-col :span="12"><el-button style="width: 100%" @click="handleResetPassword" :loading="accountLoading" type="warning" plain>重置密码</el-button></el-col>
                  <el-col :span="12"><el-button style="width: 100%" @click="handleSendLoginCode" :loading="accountLoading" type="primary" plain>发送登录验证码</el-button></el-col>
                </el-row>
              </el-card>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="客户编号">{{ websiteAccount.customerCode }}</el-descriptions-item>
                <el-descriptions-item label="密码状态">
                  <el-tag :type="websiteAccount.hasPassword ? 'success' : 'warning'" size="small">{{ websiteAccount.hasPassword ? '✅ 已设置' : '⚠️ 未设置' }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="注册时间">{{ websiteAccount.registeredAt || '—' }}</el-descriptions-item>
                <el-descriptions-item label="最后登录">{{ websiteAccount.lastLoginAt || '—' }}</el-descriptions-item>
                <el-descriptions-item label="累计订单">{{ websiteAccount.totalOrders || 0 }}</el-descriptions-item>
                <el-descriptions-item label="累计消费">¥{{ Number(websiteAccount.totalAmount || 0).toFixed(2) }}</el-descriptions-item>
              </el-descriptions>
            </template>
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-drawer>

    <!-- 联系人弹窗 -->
    <el-dialog v-model="contactDialogVisible" title="添加联系人" width="500px" destroy-on-close>
      <el-form :model="contactForm" label-width="80px">
        <el-form-item label="姓名"><el-input v-model="contactForm.contactName" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="contactForm.role" placeholder="选择角色" clearable style="width: 100%" :options="dictContactRoleOptions" />
        </el-form-item>
        <el-form-item label="电话"><el-input v-model="contactForm.phone" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="contactForm.email" /></el-form-item>
        <el-form-item label="微信"><el-input v-model="contactForm.wechat" /></el-form-item>
        <el-form-item label="主要联系人">
          <el-switch v-model="contactForm.isPrimary" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="contactDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddContact">保存</el-button>
      </template>
    </el-dialog>

    <!-- 地址弹窗（新增/编辑共用） -->
    <el-dialog v-model="addressDialogVisible" :title="isEditAddress ? '编辑地址' : '添加地址'" width="500px" destroy-on-close>
      <el-form :model="addressForm" label-width="80px">
        <el-form-item label="类型">
          <el-select v-model="addressForm.addressType" style="width: 100%">
            <el-option label="收货" value="shipping" />
            <el-option label="结算" value="billing" />
            <el-option label="办公" value="office" />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="省份"><el-input v-model="addressForm.province" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="城市"><el-input v-model="addressForm.city" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="区县"><el-input v-model="addressForm.district" /></el-form-item>
        <el-form-item label="详细地址"><el-input v-model="addressForm.detailAddress" type="textarea" :rows="2" /></el-form-item>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="收件人"><el-input v-model="addressForm.receiverName" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="收件电话"><el-input v-model="addressForm.receiverPhone" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="默认地址"><el-switch v-model="addressForm.isDefault" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addressDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveAddress">保存</el-button>
      </template>
    </el-dialog>

    <!-- 阶梯定价弹窗 -->
    <el-dialog v-model="tierDialogVisible" title="添加阶梯定价" width="500px" destroy-on-close>
      <el-form :model="tierForm" label-width="100px">
        <el-form-item label="档位名称"><el-input v-model="tierForm.tierName" placeholder="如 A档" /></el-form-item>
        <el-form-item label="最小数量"><el-input-number v-model="tierForm.minQty" :min="1" style="width: 100%" /></el-form-item>
        <el-form-item label="最大数量"><el-input-number v-model="tierForm.maxQty" :min="1" style="width: 100%" /></el-form-item>
        <el-form-item label="折扣率">
          <el-input-number v-model="tierForm.discountRate" :min="0" :max="1" :step="0.05" :precision="2" style="width: 100%" />
          <span style="margin-left: 8px; color: #999">{{ (tierForm.discountRate * 100).toFixed(0) }}%</span>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="tierForm.notes" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tierDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddTierPricing">保存</el-button>
      </template>
    </el-dialog>

    <!-- 处方弹窗 -->
    <el-dialog v-model="prescriptionDialogVisible" title="添加处方" width="720px" destroy-on-close>
      <el-form :model="prescriptionForm" label-width="100px">
        <el-form-item label="标签"><el-input v-model="prescriptionForm.label" placeholder="如：我的处方-2026" /></el-form-item>
        <el-divider content-position="left">右眼 (OD)</el-divider>
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="球镜 S"><el-input-number v-model="prescriptionForm.odSphere" :min="-20" :max="20" :step="0.25" :precision="2" controls-position="right" style="width: 100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="柱镜 C"><el-input-number v-model="prescriptionForm.odCylinder" :min="-10" :max="10" :step="0.25" :precision="2" controls-position="right" style="width: 100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="轴位 A"><el-input-number v-model="prescriptionForm.odAxis" :min="0" :max="180" controls-position="right" style="width: 100%" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="ADD"><el-input-number v-model="prescriptionForm.odAdd" :min="-10" :max="10" :step="0.25" :precision="2" controls-position="right" style="width: 100%" /></el-form-item></el-col>
        </el-row>
        <el-divider content-position="left">左眼 (OS)</el-divider>
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="球镜 S"><el-input-number v-model="prescriptionForm.osSphere" :min="-20" :max="20" :step="0.25" :precision="2" controls-position="right" style="width: 100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="柱镜 C"><el-input-number v-model="prescriptionForm.osCylinder" :min="-10" :max="10" :step="0.25" :precision="2" controls-position="right" style="width: 100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="轴位 A"><el-input-number v-model="prescriptionForm.osAxis" :min="0" :max="180" controls-position="right" style="width: 100%" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="ADD"><el-input-number v-model="prescriptionForm.osAdd" :min="-10" :max="10" :step="0.25" :precision="2" controls-position="right" style="width: 100%" /></el-form-item></el-col>
        </el-row>
        <el-divider content-position="left">其他</el-divider>
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="瞳距"><el-input-number v-model="prescriptionForm.pdValue" :min="40" :max="80" :step="0.5" :precision="1" controls-position="right" style="width: 100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="来源"><el-select v-model="prescriptionForm.sourceType" style="width: 100%"><el-option label="手动录入" value="manual_upload" /><el-option label="OCR识别" value="ocr" /><el-option label="API验光" value="api_optometry" /></el-select></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="处方日期"><el-date-picker v-model="prescriptionForm.prescriptionDate" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="过期日期"><el-date-picker v-model="prescriptionForm.expireDate" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="prescriptionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddPrescription">保存</el-button>
      </template>
    </el-dialog>

    <!-- 客户镜片弹窗 -->
    <el-dialog v-model="lensDialogVisible" title="添加客户镜片" width="500px" destroy-on-close>
      <el-form :model="lensForm" label-width="110px">
        <el-form-item label="结构标准编码"><el-input v-model="lensForm.lensStandardCode" placeholder="如：5147" /></el-form-item>
        <el-form-item label="关联处方">
          <el-select v-model="lensForm.prescriptionId" placeholder="可选：关联已有处方" clearable style="width: 100%">
            <el-option v-for="rx in prescriptions" :key="rx.prescriptionId" :label="rx.label || rx.prescriptionId" :value="rx.prescriptionId" />
          </el-select>
        </el-form-item>
        <el-form-item label="购买日期"><el-date-picker v-model="lensForm.purchaseDate" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item label="来源订单"><el-input v-model="lensForm.orderId" placeholder="可选" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="lensDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddLens">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { useDict } from '@/composables/useDict'
import request from '@/api/request'
import {
  getCustomerList, createCustomer, updateCustomer, deleteCustomer, getCustomerDetail,
  getContacts, addContact, getAddresses, addAddress, updateAddress, deleteAddress,
  getTierPricings, addTierPricing,
  getPrescriptions, addPrescription, deletePrescription,
  getCustomerLenses, getCustomerLensSummary, addCustomerLens, deleteCustomerLens,
  getMemberLevelLogs, getPointsTransactions, getAccountInfo, getCustomerOrders,
  getWebsiteAccount, getLoginLogs, registerWebsiteAccount, resetPassword, toggleAccountStatus, sendLoginCode,
} from '@/api/customer'

// 字典：客户类型 / 客户等级 / 客户状态 / 来源渠道 / 订阅状态 / 联系人角色
const dictType = useDict('dict_customer_type')
const dictLevel = useDict('dict_customer_level')
const dictStatus = useDict('dict_customer_status')
const dictReferral = useDict('dict_referral_source')
const dictSubscription = useDict('dict_subscription_status')
const dictContactRole = useDict('dict_contact_role')

// 构建 options 格式数组
const dictTypeOptions = computed(() => dictType.items.value.map(d => ({ label: d.name, value: d.code })))
const dictLevelOptions = computed(() => dictLevel.items.value.map(d => ({ label: d.name, value: d.code })))
const dictStatusOptions = computed(() => dictStatus.items.value.map(d => ({ label: d.name, value: d.code })))
const dictReferralOptions = computed(() => dictReferral.items.value.map(d => ({ label: d.name, value: d.code })))
const dictSubscriptionOptions = computed(() => dictSubscription.items.value.map(d => ({ label: d.name, value: d.code })))
const dictContactRoleOptions = computed(() => dictContactRole.items.value.map(d => ({ label: d.name, value: d.code })))

// 增强的 fallback 映射（确保即使字典加载失败也能显示中文）
const CUSTOMER_TYPE_FALLBACK: Record<string, string> = {
  retail: '零售',
  business: '批发',
  partner: '合作伙伴',
  '': '—'
}

const CUSTOMER_LEVEL_FALLBACK: Record<string, string> = {
  normal: '普通',
  vip: 'VIP',
  svip: 'SVIP',
  '': '—'
}

// 监控字典加载状态
watch(() => dictType.error.value, (error) => {
  if (error) {
    console.error('[Customers] dict_customer_type 加载错误:', error)
    ElMessage.warning('客户类型字典加载失败')
  }
}, { immediate: true })

watch(() => dictLevel.error.value, (error) => {
  if (error) {
    console.error('[Customers] dict_customer_level 加载错误:', error)
    ElMessage.warning('客户等级字典加载失败')
  }
}, { immediate: true })

const loading = ref(false)
const saving = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const detailVisible = ref(false)
const isEdit = ref(false)
const editId = ref('')
const formRef = ref<FormInstance>()
const detail = ref<any>(null)
// 批量选择
const selectedRows = ref<any[]>([])
const handleSelectionChange = (rows: any[]) => { selectedRows.value = rows }
const contacts = ref<any[]>([])
const addresses = ref<any[]>([])
const tierPricings = ref<any[]>([])
const prescriptions = ref<any[]>([])
const customerLenses = ref<any[]>([])
const lensSummary = ref<any>(null)

// P1+ 新增
const activeTab = ref('basic')
const customerOrders = ref<any[]>([])
const orderTotal = ref(0)
const orderPage = ref(1)
const ordersLoading = ref(false)
const memberLevelLogs = ref<any[]>([])
const pointsTransactions = ref<any[]>([])
const accountInfo = ref<any>(null)

// 官网账户管理
const websiteAccount = ref<any>(null)
const loginLogs = ref<any[]>([])
const loginLogsLoading = ref(false)
const accountLoading = ref(false)

const query = reactive({ page: 1, pageSize: 20, keyword: '', customerType: '', customerLevel: '', status: '' })

const form = reactive({
  customerType: 'retail', customerLevel: 'normal', companyName: '', contactName: '',
  phone: '', email: '', wechatId: '', nickname: '', address: '', city: '', province: '',
  status: 'active', notes: '', referralSource: '', preferredStyle: '', subscriptionStatus: '',
})

const rules = {
  customerType: [{ required: true, message: '请选择客户类型', trigger: 'change' }],
  contactName: [{ required: true, message: '请输入联系人姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
}

function typeTag(t: string) { return { retail: 'primary', business: 'warning', partner: 'success' }[t] || 'info' }
function typeLabel(t: string) { 
  return dictType.labels.value[t] || CUSTOMER_TYPE_FALLBACK[t] || t
}
function levelTag(l: string) { return { normal: 'info', vip: 'primary', svip: 'danger' }[l] || 'info' }
function levelLabel(l: string) { 
  return dictLevel.labels.value[l] || CUSTOMER_LEVEL_FALLBACK[l] || l
}
function statusTag(s: string) {
  const item = dictStatus.items.value.find(d => d.code === s) as any
  return item?.color || { active: 'success', inactive: 'info', blacklisted: 'danger' }[s] || 'info'
}
function statusLabel(s: string) {
  return dictStatus.labels.value[s] || { active: '启用', inactive: '停用', blacklisted: '黑名单' }[s] || s
}
function referralLabel(r: string) {
  return dictReferral.labels.value[r] || { xiaohongshu: '小红书', douyin: '抖音', referral: '朋友推荐', website: '官网', offline: '线下门店', other: '其他' }[r] || r || '—'
}
function subscriptionLabel(s: string) {
  return dictSubscription.labels.value[s] || { none: '未订阅', active: '已订阅', expired: '已过期' }[s] || s || '—'
}
function sourceTypeLabel(t: string) { return { manual_upload: '手动录入', ocr: 'OCR识别', api_optometry: 'API验光' }[t] || t || '—' }
function isExpired(date: string) { if (!date) return false; return new Date(date) < new Date() }
function addrTypeLabel(t: string) { return { shipping: '收货', billing: '结算', office: '办公' }[t] || t || '—' }
function orderStatusTag(s: string) { return ({ pending: 'warning', paid: 'primary', shipped: 'primary', completed: 'success', cancelled: 'info' } as any)[s] || 'info' }
function orderStatusLabel(s: string) { return ({ pending: '待处理', paid: '已支付', shipped: '已发货', completed: '已完成', cancelled: '已取消' } as any)[s] || s || '—' }
function accountLabel(s: string) { return { active: '已激活', inactive: '未激活', suspended: '已冻结', deactivated: '已注销', none: '未注册' }[s] || s || '—' }
function statusType(s: string) { return ({ active: 'success', inactive: 'info', suspended: 'danger', deactivated: 'info', none: 'info' } as any)[s] || 'info' }
function memberLabel(since: string | null, validUntil: string | null) {
  if (!since) return '非会员'
  if (validUntil && new Date(validUntil) < new Date()) return '已过期'
  return '会员'
}
function formatDateTime(dateStr: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-')
}
function triggerTypeTag(t: string) { return { upgrade: 'success', downgrade: 'danger', manual: 'warning' }[t] || 'info' }
function triggerTypeLabel(t: string) { return { upgrade: '升级', downgrade: '降级', manual: '手动' }[t] || t || '—' }
function pointsTypeTag(t: string) { return { order_earn: 'success', order_burn: 'danger', manual: 'warning', expire: 'info' }[t] || 'info' }
function pointsTypeLabel(t: string) { return { order_earn: '消费获得', order_burn: '消费抵扣', manual: '手动调整', expire: '过期' }[t] || t || '—' }

// 会员升级进度计算
const upgradeProgress = computed(() => {
  if (!detail.value) return 0
  const thresholds: Record<string, number> = { normal: 500, vip: 2000, svip: 5000, gold: 5000 }
  const currentLevel = detail.value.customerLevel || 'normal'
  const totalAmount = Number(detail.value.totalAmount || 0)
  const nextThreshold = thresholds[currentLevel] ?? 5000
  return Math.min(100, Math.round((totalAmount / nextThreshold) * 100))
})

const nextLevelInfo = computed(() => {
  if (!detail.value) return '—'
  const levels: Record<string, { next: string; threshold: number }> = {
    normal: { next: 'VIP', threshold: 500 },
    vip: { next: 'SVIP', threshold: 2000 },
    svip: { next: 'Gold', threshold: 5000 },
    gold: { next: '最高', threshold: 5000 },
  }
  const currentLevel = detail.value.customerLevel || 'normal'
  const info = levels[currentLevel]
  if (!info) return '—'
  const remaining = Math.max(0, info.threshold - Number(detail.value.totalAmount || 0))
  if (info.next === '最高') return '已是最高等级'
  return `¥${remaining.toFixed(0)} 达 ${info.next}`
})

async function loadData() {
  loading.value = true
  try {
    const res = await getCustomerList(query)
    tableData.value = res.items
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  Object.assign(query, { page: 1, pageSize: 20, keyword: '', customerType: '', customerLevel: '', status: '' })
  loadData()
}

async function openDialog(row?: any) {
  // 强制刷新字典缓存，确保弹窗中下拉选项为最新数据
  await Promise.all([dictType.forceReload(), dictLevel.forceReload()])
  
  isEdit.value = !!row
  editId.value = row?.customerId || ''
  if (row) {
    Object.assign(form, row)
  } else {
    Object.assign(form, { customerType: 'retail', customerLevel: 'normal', companyName: '', contactName: '', phone: '', email: '', wechatId: '', nickname: '', address: '', city: '', province: '', status: 'active', notes: '', referralSource: '', preferredStyle: '', subscriptionStatus: '' })
  }
  dialogVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    // 严格构造 DTO payload，避免 forbidNonWhitelisted 拒绝
    const payload = {
      customerType: form.customerType,
      customerLevel: form.customerLevel,
      companyName: form.companyName,
      contactName: form.contactName,
      phone: form.phone,
      email: form.email || undefined,
      wechat: form.wechat,
      wechatId: form.wechatId,
      nickname: form.nickname,
      avatarUrl: form.avatarUrl,
      address: form.address,
      city: form.city,
      province: form.province,
      notes: form.notes,
      status: form.status,
      wholesaleTier: form.wholesaleTier,
      memberDiscountRate: form.memberDiscountRate,
      pointsBalance: form.pointsBalance,
      partnerServices: form.partnerServices,
      referralSource: form.referralSource,
      preferredStyle: form.preferredStyle,
      subscriptionStatus: form.subscriptionStatus,
    }
    if (isEdit.value) {
      await updateCustomer(editId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createCustomer(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (e: unknown) {
    console.error('保存失败:', e)
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: Record<string, unknown>) {
  await deleteCustomer(row.customerId)
  ElMessage.success('删除成功')
  loadData()
}

async function batchEdit() {
  if (selectedRows.value.length === 0) { ElMessage.warning('请先勾选客户'); return }
  if (selectedRows.value.length > 1) { ElMessage.warning('暂仅支持单条编辑，请只勾选一个客户'); return }
  openDialog(selectedRows.value[0])
}

async function batchDelete() {
  if (selectedRows.value.length === 0) { ElMessage.warning('请先勾选客户'); return }
  for (const row of selectedRows.value) {
    await deleteCustomer(row.customerId)
  }
  ElMessage.success(`已删除 ${selectedRows.value.length} 条`)
  selectedRows.value = []
  loadData()
}

async function openDetail(row: Record<string, unknown>) {
  detail.value = await getCustomerDetail(row.customerId)
  contacts.value = await getContacts(row.customerId)
  addresses.value = await getAddresses(row.customerId)
  tierPricings.value = row.customerType === 'business' ? await getTierPricings(row.customerId) : []
  try { prescriptions.value = await getPrescriptions(row.customerId) } catch { prescriptions.value = [] }
  try { customerLenses.value = await getCustomerLenses(row.customerId) } catch { customerLenses.value = [] }
  try { lensSummary.value = await getCustomerLensSummary(row.customerId) } catch { lensSummary.value = null }

  // P1+ 加载额外数据
  activeTab.value = 'basic'
  // 所有客户类型都加载官网账户信息
  try { websiteAccount.value = await getWebsiteAccount(row.customerId) } catch { websiteAccount.value = null }
  if (row.customerType === 'retail') {
    orderPage.value = 1
    loadCustomerOrders()
    try { memberLevelLogs.value = await getMemberLevelLogs(row.customerId) } catch { memberLevelLogs.value = [] }
    try { pointsTransactions.value = await getPointsTransactions(row.customerId) } catch { pointsTransactions.value = [] }
    try { accountInfo.value = await getAccountInfo(row.customerId) } catch { accountInfo.value = null }
  }

  detailVisible.value = true
}

async function loadCustomerOrders() {
  if (!detail.value) return
  ordersLoading.value = true
  try {
    const res = await getCustomerOrders(detail.value.customerId, orderPage.value, 10)
    customerOrders.value = res.items || []
    orderTotal.value = res.total || 0
  } catch {
    customerOrders.value = []
    orderTotal.value = 0
  } finally {
    ordersLoading.value = false
  }
}

// ---- 子弹窗 ----
const contactDialogVisible = ref(false)
const contactForm = reactive({ customerId: '', contactName: '', role: '', phone: '', email: '', wechat: '', isPrimary: false })
function openContactDialog() {
  Object.assign(contactForm, { customerId: detail.value.customerId, contactName: '', role: '', phone: '', email: '', wechat: '', isPrimary: false })
  contactDialogVisible.value = true
}
async function handleAddContact() {
  await addContact(contactForm)
  ElMessage.success('联系人已添加')
  contacts.value = await getContacts(detail.value.customerId)
  contactDialogVisible.value = false
}

// ---- 地址弹窗（新增/编辑共用） ----
const addressDialogVisible = ref(false)
const isEditAddress = ref(false)
const editAddressId = ref('')
const addressForm = reactive({ customerId: '', addressType: 'shipping', province: '', city: '', district: '', detailAddress: '', receiverName: '', receiverPhone: '', isDefault: false })
function openAddressDialog() {
  isEditAddress.value = false
  editAddressId.value = ''
  Object.assign(addressForm, { customerId: detail.value.customerId, addressType: 'shipping', province: '', city: '', district: '', detailAddress: '', receiverName: '', receiverPhone: '', isDefault: false })
  addressDialogVisible.value = true
}
function openEditAddress(row: Record<string, unknown>) {
  isEditAddress.value = true
  editAddressId.value = row.addressId
  Object.assign(addressForm, { customerId: detail.value.customerId, addressType: row.addressType, province: row.province || '', city: row.city || '', district: row.district || '', detailAddress: row.detailAddress, receiverName: row.receiverName, receiverPhone: row.receiverPhone, isDefault: row.isDefault })
  addressDialogVisible.value = true
}
async function handleSaveAddress() {
  if (isEditAddress.value) {
    await updateAddress(editAddressId.value, addressForm)
    ElMessage.success('地址已更新')
  } else {
    await addAddress(addressForm)
    ElMessage.success('地址已添加')
  }
  addresses.value = await getAddresses(detail.value.customerId)
  addressDialogVisible.value = false
}
async function handleDeleteAddress(id: string) {
  await deleteAddress(id)
  ElMessage.success('地址已删除')
  addresses.value = await getAddresses(detail.value.customerId)
}

const tierDialogVisible = ref(false)
const tierForm = reactive({ customerId: '', tierName: '', minQty: 1, maxQty: null as number | null, discountRate: 0.95, notes: '' })
function openTierPricingDialog() {
  Object.assign(tierForm, { customerId: detail.value.customerId, tierName: '', minQty: 1, maxQty: null, discountRate: 0.95, notes: '' })
  tierDialogVisible.value = true
}
async function handleAddTierPricing() {
  await addTierPricing(tierForm)
  ElMessage.success('定价已添加')
  tierPricings.value = await getTierPricings(detail.value.customerId)
  tierDialogVisible.value = false
}

// ---- 处方弹窗 ----
const prescriptionDialogVisible = ref(false)
const prescriptionForm = reactive({
  customerId: '', label: '',
  odSphere: null as number | null, odCylinder: null as number | null, odAxis: null as number | null, odAdd: null as number | null,
  osSphere: null as number | null, osCylinder: null as number | null, osAxis: null as number | null, osAdd: null as number | null,
  pdValue: null as number | null, sourceType: 'manual_upload', prescriptionDate: '', expireDate: '',
})
function openPrescriptionDialog() {
  Object.assign(prescriptionForm, {
    customerId: detail.value.customerId, label: '',
    odSphere: null, odCylinder: null, odAxis: null, odAdd: null,
    osSphere: null, osCylinder: null, osAxis: null, osAdd: null,
    pdValue: null, sourceType: 'manual_upload', prescriptionDate: '', expireDate: '',
  })
  prescriptionDialogVisible.value = true
}
async function handleAddPrescription() {
  await addPrescription(prescriptionForm)
  ElMessage.success('处方已添加')
  prescriptions.value = await getPrescriptions(detail.value.customerId)
  prescriptionDialogVisible.value = false
}
async function handleDeletePrescription(id: string) {
  await deletePrescription(id)
  ElMessage.success('处方已删除')
  prescriptions.value = await getPrescriptions(detail.value.customerId)
}

// ---- 客户镜片弹窗 ----
const lensDialogVisible = ref(false)
const lensForm = reactive({
  customerId: '', lensStandardCode: '', prescriptionId: '', purchaseDate: '', orderId: '',
})
function openLensDialog() {
  Object.assign(lensForm, { customerId: detail.value.customerId, lensStandardCode: '', prescriptionId: '', purchaseDate: '', orderId: '' })
  lensDialogVisible.value = true
}
async function handleAddLens() {
  await addCustomerLens(lensForm)
  ElMessage.success('镜片已添加')
  customerLenses.value = await getCustomerLenses(detail.value.customerId)
  try { lensSummary.value = await getCustomerLensSummary(detail.value.customerId) } catch {}
  lensDialogVisible.value = false
}
async function handleDeleteLens(id: string) {
  await deleteCustomerLens(id)
  ElMessage.success('镜片已删除')
  customerLenses.value = await getCustomerLenses(detail.value.customerId)
  try { lensSummary.value = await getCustomerLensSummary(detail.value.customerId) } catch {}
}

// ============================================================
// 官网账户管理（电商视角）
// ============================================================

function onTabClick(tab: any) {
  // 切换到官网账户 Tab 时加载登录日志
  if (tab.props?.name === 'account' && websiteAccount.value?.accountStatus !== 'none') {
    loadLoginLogs()
  }
}

async function loadWebsiteAccount() {
  if (!detail.value) return
  try {
    websiteAccount.value = await getWebsiteAccount(detail.value.customerId)
    // 如果已注册，同时加载登录日志
    if (websiteAccount.value?.accountStatus !== 'none') {
      loadLoginLogs()
    }
  } catch { websiteAccount.value = null }
}

async function loadLoginLogs() {
  if (!detail.value) return
  loginLogsLoading.value = true
  try {
    const res = await getLoginLogs(detail.value.customerId, 20)
    loginLogs.value = res.logs || []
  } catch { loginLogs.value = [] }
  finally { loginLogsLoading.value = false }
}

async function handleRegisterAccount() {
  if (!detail.value) return
  accountLoading.value = true
  try {
    const res = await registerWebsiteAccount(detail.value.customerId)
    ElMessage.success({
      message: `官网账户已创建！手机号: ${res.phone}，密码已发送至客户手机`,
      duration: 6000,
      showClose: true,
    })
    await loadWebsiteAccount()
  } catch (e: unknown) {
    ElMessage.error(e.response?.data?.message || '创建失败')
  } finally { accountLoading.value = false }
}

async function handleResetPassword() {
  if (!detail.value) return
  accountLoading.value = true
  try {
    const res = await resetPassword(detail.value.customerId)
    ElMessage.success({
      message: `密码已重置，新密码已发送至客户手机`,
      duration: 6000,
      showClose: true,
    })
  } catch (e: unknown) {
    ElMessage.error(e.response?.data?.message || '重置失败')
  } finally { accountLoading.value = false }
}

async function handleSendLoginCode() {
  if (!detail.value) return
  accountLoading.value = true
  try {
    const res = await sendLoginCode(detail.value.customerId)
    ElMessage.success(res.message || '验证码已发送')
  } catch (e: unknown) {
    ElMessage.error(e.response?.data?.message || '发送失败')
  } finally { accountLoading.value = false }
}

async function handleStatusChange(status: string) {
  if (!detail.value) return
  try {
    const res = await toggleAccountStatus(detail.value.customerId, status)
    ElMessage.success(res.message)
    await loadWebsiteAccount()
  } catch (e: unknown) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  }
}

onMounted(loadData)
</script>

<style scoped>
.customer-page { padding: 0; }
.filter-form { margin-bottom: 0; }

/* 输入框宽度修复 */
.el-dialog .el-input,
.el-dialog .el-select,
.el-dialog .el-date-editor { width: 100% !important; }
.el-dialog .el-input-number { width: 100% !important; }

/* 会员卡片样式 */
.member-stat { text-align: center; padding: 8px 0; }
.member-stat-value { font-size: 20px; font-weight: 600; color: #303133; }
.member-stat-label { font-size: 12px; color: #909399; margin-top: 4px; }
</style>
