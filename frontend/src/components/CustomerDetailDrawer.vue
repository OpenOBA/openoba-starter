<!--
  CustomerDetailDrawer.vue — P1-3 前端重构
  Customers.vue 的客户详情抽屉独立组件
  包含：7 个 Tab（C 端）+ 5 个 Tab（B 端）+ 6 个子弹窗
  策略 B：数据下沉，内部调用 composable，只接受 customerId
-->
<template>
  <el-drawer
    v-model="internalVisible"
    :title="'客户详情 — ' + (detail?.contactName || '')"
    size="900px"
    destroy-on-close
    @close="emit('close')"
  >
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
              <el-tag :type="levelTag(detail.customerLevel as string)" size="small" effect="dark">{{
                (detail.customerLevel as string)?.toUpperCase()
              }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ detail.email || '—' }}</el-descriptions-item>
            <el-descriptions-item label="微信">{{ detail.wechatId || '—' }}</el-descriptions-item>
            <el-descriptions-item label="来源渠道">{{
              referralLabel(detail.referralSource as string)
            }}</el-descriptions-item>
            <el-descriptions-item label="偏好风格">{{ detail.preferredStyle || '—' }}</el-descriptions-item>
            <el-descriptions-item label="订阅状态">{{
              subscriptionLabel(detail.subscriptionStatus as string)
            }}</el-descriptions-item>
            <el-descriptions-item label="城市">{{
              detail.province ? detail.province + ' ' + detail.city : detail.city || '—'
            }}</el-descriptions-item>
            <el-descriptions-item label="累计订单">{{ detail.totalOrders || 0 }}</el-descriptions-item>
            <el-descriptions-item label="累计消费"
              >¥{{ Number(detail.totalAmount || 0).toFixed(2) }}</el-descriptions-item
            >
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
              <template #default="{ row }"
                >S:{{ row.odSphere || '—' }} C:{{ row.odCylinder || '—' }} A:{{ row.odAxis || '—'
                }}<span v-if="row.odAdd"> ADD:{{ row.odAdd }}</span></template
              >
            </el-table-column>
            <el-table-column label="左眼(OS)" width="200">
              <template #default="{ row }"
                >S:{{ row.osSphere || '—' }} C:{{ row.osCylinder || '—' }} A:{{ row.osAxis || '—'
                }}<span v-if="row.osAdd"> ADD:{{ row.osAdd }}</span></template
              >
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
                <el-tag :type="isExpired(row.expireDate) ? 'danger' : 'success'" size="small">{{
                  row.expireDate || '长期有效'
                }}</el-tag>
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
            <el-descriptions-item label="镜片总数">{{
              (lensSummary?.total as number) || customerLenses.length || 0
            }}</el-descriptions-item>
            <el-descriptions-item label="在用">{{
              (lensSummary?.active as number) || customerLenses.filter((l) => l.status === 'active').length || 0
            }}</el-descriptions-item>
            <el-descriptions-item label="已停用">{{
              ((lensSummary?.total as number) || customerLenses.length || 0) -
                ((lensSummary?.active as number) || customerLenses.filter((l) => l.status === 'active').length || 0) ||
              0
            }}</el-descriptions-item>
          </el-descriptions>
          <el-table :data="customerLenses" size="small" border style="margin-bottom: 12px">
            <el-table-column prop="lensStandardCode" label="结构标准" width="120" />
            <el-table-column label="状态" width="80">
              <template #default="{ row }"
                ><el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">{{
                  row.status === 'active' ? '在用' : '停用'
                }}</el-tag></template
              >
            </el-table-column>
            <el-table-column label="关联处方" width="100">
              <template #default="{ row }"
                ><span v-if="row.prescriptionId">已关联</span><span v-else style="color: #999">未关联</span></template
              >
            </el-table-column>
            <el-table-column label="购买日期" width="110"
              ><template #default="{ row }">{{ row.purchaseDate || '—' }}</template></el-table-column
            >
            <el-table-column label="来源订单" width="140"
              ><template #default="{ row }">{{ row.orderId || '—' }}</template></el-table-column
            >
            <el-table-column label="创建时间" width="160"
              ><template #default="{ row }">{{ row.createdAt }}</template></el-table-column
            >
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
          <el-table v-loading="ordersLoading" :data="customerOrders" size="small" border style="margin-bottom: 12px">
            <el-table-column prop="orderNo" label="订单号" width="160" />
            <el-table-column label="状态" width="80">
              <template #default="{ row }"
                ><el-tag :type="orderStatusTag(row.status)" size="small">{{
                  orderStatusLabel(row.status)
                }}</el-tag></template
              >
            </el-table-column>
            <el-table-column label="商品数" width="60" align="center"
              ><template #default="{ row }">{{ row.items?.length || 0 }}</template></el-table-column
            >
            <el-table-column label="订单金额" width="100" align="right"
              ><template #default="{ row }">¥{{ Number(row.totalAmount || 0).toFixed(2) }}</template></el-table-column
            >
            <el-table-column label="创建时间" width="160"
              ><template #default="{ row }">{{ row.createdAt }}</template></el-table-column
            >
          </el-table>
          <el-pagination
            v-if="orderTotal > 0"
            v-model:current-page="orderPage"
            :page-size="10"
            :total="orderTotal"
            layout="prev, pager, next"
            small
            style="justify-content: flex-end"
            @current-change="loadCustomerOrders"
          />
          <el-empty v-if="!ordersLoading && customerOrders.length === 0" description="暂无消费记录" :image-size="80" />
        </el-tab-pane>

        <!-- Tab 6: 官网账户 -->
        <el-tab-pane label="官网账户" name="account">
          <el-empty v-if="!websiteAccount" description="该客户尚未注册官网账户" :image-size="80">
            <el-button type="primary" size="small" :loading="accountLoading" @click="handleRegisterAccount"
              >一键注册官网账户</el-button
            >
          </el-empty>
          <template v-if="websiteAccount">
            <el-card shadow="never" style="margin-bottom: 16px; background: #fafafa">
              <el-row :gutter="16" align="middle">
                <el-col :span="12">
                  <div style="display: flex; align-items: center; gap: 12px">
                    <el-avatar :size="40" style="background: #409eff">{{
                      websiteAccount.contactName?.charAt(0) || '用'
                    }}</el-avatar>
                    <div>
                      <div style="font-size: 16px; font-weight: 600">{{ websiteAccount.contactName }}</div>
                      <div style="font-size: 12px; color: #909399">{{ websiteAccount.phone }}</div>
                    </div>
                  </div>
                </el-col>
                <el-col :span="12" style="text-align: right"
                  ><el-tag :type="statusType(websiteAccount.accountStatus ?? '')" size="large" effect="dark">{{
                    accountLabel(websiteAccount.accountStatus ?? '')
                  }}</el-tag></el-col
                >
              </el-row>
            </el-card>
            <el-card shadow="never" style="margin-bottom: 16px">
              <template #header><span style="font-weight: 600">账户操作</span></template>
              <el-row :gutter="12">
                <el-col :span="8"
                  ><el-button
                    style="width: 100%"
                    :loading="accountLoading"
                    type="warning"
                    plain
                    @click="handleResetPassword"
                    >重置密码</el-button
                  ></el-col
                >
                <el-col :span="8"
                  ><el-button
                    style="width: 100%"
                    :loading="accountLoading"
                    type="primary"
                    plain
                    @click="handleSendLoginCode"
                    >发送登录验证码</el-button
                  ></el-col
                >
                <el-col :span="8">
                  <el-dropdown trigger="click" @command="handleStatusChange">
                    <el-button style="width: 100%" plain>切换状态</el-button>
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
            <el-descriptions :column="2" border size="small" style="margin-bottom: 16px">
              <el-descriptions-item label="客户编号">{{ websiteAccount.customerCode }}</el-descriptions-item>
              <el-descriptions-item label="密码状态"
                ><el-tag :type="websiteAccount.hasPassword ? 'success' : 'warning'" size="small">{{
                  websiteAccount.hasPassword ? '已设置' : '未设置'
                }}</el-tag></el-descriptions-item
              >
              <el-descriptions-item label="注册时间">{{ websiteAccount.registeredAt || '—' }}</el-descriptions-item>
              <el-descriptions-item label="最后登录">{{ websiteAccount.lastLoginAt || '—' }}</el-descriptions-item>
              <el-descriptions-item label="累计订单">{{ websiteAccount.totalOrders || 0 }}</el-descriptions-item>
              <el-descriptions-item label="累计消费"
                >¥{{ Number(websiteAccount.totalAmount || 0).toFixed(2) }}</el-descriptions-item
              >
              <el-descriptions-item label="积分余额">{{ websiteAccount.pointsBalance || 0 }}</el-descriptions-item>
              <el-descriptions-item label="会员折扣">{{ websiteAccount.memberDiscountRate }} 折</el-descriptions-item>
              <el-descriptions-item label="订阅状态">{{
                subscriptionLabel(websiteAccount.subscriptionStatus ?? '')
              }}</el-descriptions-item>
              <el-descriptions-item label="会员身份">{{
                memberLabel(websiteAccount.memberSince ?? '', websiteAccount.memberValidUntil ?? '')
              }}</el-descriptions-item>
            </el-descriptions>
            <el-card shadow="never">
              <template #header
                ><div style="display: flex; justify-content: space-between; align-items: center">
                  <span style="font-weight: 600">登录记录</span
                  ><el-button size="small" :loading="loginLogsLoading" @click="loadLoginLogs">刷新</el-button>
                </div></template
              >
              <el-table
                v-loading="loginLogsLoading"
                :data="loginLogs"
                size="small"
                border
                max-height="300"
                empty-text="暂无登录记录"
              >
                <el-table-column label="时间" width="170"
                  ><template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template></el-table-column
                >
                <el-table-column label="方式" width="100"
                  ><template #default="{ row }"
                    ><el-tag :type="row.loginMethod === 'sms_code' ? 'primary' : 'info'" size="small">{{
                      row.loginMethod === 'sms_code' ? '验证码登录' : '密码登录'
                    }}</el-tag></template
                  ></el-table-column
                >
                <el-table-column label="结果" width="80"
                  ><template #default="{ row }"
                    ><el-tag :type="row.loginResult === 'success' ? 'success' : 'danger'" size="small">{{
                      row.loginResult === 'success' ? '成功' : '失败'
                    }}</el-tag></template
                  ></el-table-column
                >
                <el-table-column label="失败原因" show-overflow-tooltip
                  ><template #default="{ row }">{{ row.failReason || '—' }}</template></el-table-column
                >
                <el-table-column label="IP" width="140"
                  ><template #default="{ row }">{{ row.ipAddress || '—' }}</template></el-table-column
                >
              </el-table>
            </el-card>
          </template>
        </el-tab-pane>

        <!-- Tab 7: 会员等级 -->
        <el-tab-pane label="会员等级" name="member">
          <el-card shadow="never" style="margin-bottom: 16px; background: #fafafa">
            <el-row :gutter="16">
              <el-col :span="6"
                ><div class="member-stat">
                  <div class="member-stat-value">
                    <el-tag :type="levelTag(detail.customerLevel as string)" effect="dark" size="large">{{
                      (detail.customerLevel as string)?.toUpperCase() || 'NOR'
                    }}</el-tag>
                  </div>
                  <div class="member-stat-label">当前等级</div>
                </div></el-col
              >
              <el-col :span="6"
                ><div class="member-stat">
                  <div class="member-stat-value">¥{{ Number(detail.totalAmount || 0).toFixed(2) }}</div>
                  <div class="member-stat-label">累计消费</div>
                </div></el-col
              >
              <el-col :span="6"
                ><div class="member-stat">
                  <div class="member-stat-value">{{ detail.pointsBalance || 0 }} 分</div>
                  <div class="member-stat-label">积分余额</div>
                </div></el-col
              >
              <el-col :span="6"
                ><div class="member-stat">
                  <div class="member-stat-value">{{ nextLevelInfo }}</div>
                  <div class="member-stat-label">距下一级</div>
                </div></el-col
              >
            </el-row>
            <el-divider style="margin: 12px 0" />
            <el-progress
              :percentage="upgradeProgress"
              :stroke-width="8"
              :status="upgradeProgress >= 100 ? 'success' : ''"
            />
            <div style="margin-top: 8px; color: #909399; font-size: 12px">
              成为会员: {{ detail.memberSince || '—' }} &nbsp;|&nbsp; 最后活跃:
              {{ detail.lastActiveAt || '—' }} &nbsp;|&nbsp; 有效期至: {{ detail.memberValidUntil || '—' }}
            </div>
          </el-card>
          <h4 style="margin: 12px 0 8px">等级变更记录</h4>
          <el-table :data="memberLevelLogs" size="small" border>
            <el-table-column label="变更" width="140"
              ><template #default="{ row }"
                ><el-tag size="small" type="info">{{ row.oldLevel?.toUpperCase() }}</el-tag> →
                <el-tag size="small" type="success">{{ row.newLevel?.toUpperCase() }}</el-tag></template
              ></el-table-column
            >
            <el-table-column label="触发类型" width="100"
              ><template #default="{ row }"
                ><el-tag :type="triggerTypeTag(row.triggerType)" size="small">{{
                  triggerTypeLabel(row.triggerType)
                }}</el-tag></template
              ></el-table-column
            >
            <el-table-column prop="triggerReason" label="原因" show-overflow-tooltip />
            <el-table-column label="时间" width="160"
              ><template #default="{ row }">{{ row.createdAt }}</template></el-table-column
            >
          </el-table>
          <el-empty v-if="memberLevelLogs.length === 0" description="暂无等级变更记录" :image-size="60" />
          <h4 style="margin: 16px 0 8px">积分流水（最近50条）</h4>
          <el-table :data="pointsTransactions" size="small" border>
            <el-table-column label="积分" width="80" align="right"
              ><template #default="{ row }"
                ><span :style="{ color: row.points > 0 ? '#67C23A' : '#F56C6C', fontWeight: 'bold' }"
                  >{{ row.points > 0 ? '+' : '' }}{{ row.points }}</span
                ></template
              ></el-table-column
            >
            <el-table-column label="变更后余额" width="100" align="right"
              ><template #default="{ row }">{{ row.balanceAfter }}</template></el-table-column
            >
            <el-table-column label="类型" width="120"
              ><template #default="{ row }"
                ><el-tag :type="pointsTypeTag(row.type)" size="small">{{ pointsTypeLabel(row.type) }}</el-tag></template
              ></el-table-column
            >
            <el-table-column prop="description" label="描述" show-overflow-tooltip />
            <el-table-column label="时间" width="160"
              ><template #default="{ row }">{{ row.createdAt }}</template></el-table-column
            >
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <!-- B 端/partner：简化 Tab 布局 -->
      <el-tabs v-else v-model="activeTab" @tab-click="onTabClick">
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="客户编号">{{ detail.customerCode }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ detail.contactName }}</el-descriptions-item>
            <el-descriptions-item label="类型"
              ><el-tag :type="typeTag(detail.customerType as string)" size="small">{{
                typeLabel(detail.customerType as string)
              }}</el-tag></el-descriptions-item
            >
            <el-descriptions-item label="等级"
              ><el-tag :type="levelTag(detail.customerLevel as string)" size="small" effect="dark">{{
                (detail.customerLevel as string)?.toUpperCase()
              }}</el-tag></el-descriptions-item
            >
            <el-descriptions-item label="企业名称" :span="2">{{ detail.companyName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="电话">{{ detail.phone }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ detail.email || '—' }}</el-descriptions-item>
            <el-descriptions-item label="城市">{{
              detail.province ? detail.province + ' ' + detail.city : detail.city || '—'
            }}</el-descriptions-item>
            <el-descriptions-item label="累计订单">{{ detail.totalOrders || 0 }}</el-descriptions-item>
            <el-descriptions-item label="累计消费"
              >¥{{ Number(detail.totalAmount || 0).toFixed(2) }}</el-descriptions-item
            >
            <el-descriptions-item label="备注" :span="2">{{ detail.notes || '—' }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <el-tab-pane label="联系人" name="contacts">
          <el-table :data="contacts" size="small" border style="margin-bottom: 12px">
            <el-table-column prop="contactName" label="姓名" width="100" />
            <el-table-column prop="role" label="角色" width="100" />
            <el-table-column prop="phone" label="电话" width="130" />
            <el-table-column prop="email" label="邮箱" show-overflow-tooltip />
            <el-table-column label="主要" width="60"
              ><template #default="{ row }">{{ row.isPrimary ? '主地址' : '' }}</template></el-table-column
            >
          </el-table>
          <el-button size="small" @click="openContactDialog()">+ 添加联系人</el-button>
        </el-tab-pane>
        <el-tab-pane label="地址" name="address">
          <el-table :data="addresses" size="small" border style="margin-bottom: 12px">
            <el-table-column prop="addressType" label="类型" width="80"
              ><template #default="{ row }">{{ addrTypeLabel(row.addressType) }}</template></el-table-column
            >
            <el-table-column prop="province" label="省份" width="70" />
            <el-table-column prop="city" label="城市" width="80" />
            <el-table-column prop="detailAddress" label="详细地址" show-overflow-tooltip />
            <el-table-column prop="receiverName" label="收件人" width="80" />
            <el-table-column prop="receiverPhone" label="电话" width="110" />
            <el-table-column label="默认" width="60"
              ><template #default="{ row }">{{ row.isDefault ? '默认' : '' }}</template></el-table-column
            >
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
            <el-table-column prop="discountRate" label="折扣率" width="80"
              ><template #default="{ row }">{{ (row.discountRate * 100).toFixed(0) }}%</template></el-table-column
            >
            <el-table-column prop="notes" label="备注" show-overflow-tooltip />
          </el-table>
          <el-button size="small" @click="openTierPricingDialog()">+ 添加定价</el-button>
        </el-tab-pane>
        <el-tab-pane label="官网账户" name="account">
          <el-empty v-if="!websiteAccount" description="该客户尚未注册官网账户" :image-size="80">
            <el-button type="primary" size="small" :loading="accountLoading" @click="handleRegisterAccount"
              >一键注册官网账户</el-button
            >
          </el-empty>
          <template v-if="websiteAccount">
            <el-card shadow="never" style="margin-bottom: 16px; background: #fafafa">
              <el-row :gutter="16" align="middle">
                <el-col :span="12"
                  ><div style="display: flex; align-items: center; gap: 12px">
                    <el-avatar :size="40" style="background: #409eff">{{
                      websiteAccount.contactName?.charAt(0) || '用'
                    }}</el-avatar>
                    <div>
                      <div style="font-size: 16px; font-weight: 600">{{ websiteAccount.contactName }}</div>
                      <div style="font-size: 12px; color: #909399">{{ websiteAccount.phone }}</div>
                    </div>
                  </div></el-col
                >
                <el-col :span="12" style="text-align: right"
                  ><el-tag :type="statusType(websiteAccount.accountStatus ?? '')" size="large" effect="dark">{{
                    accountLabel(websiteAccount.accountStatus ?? '')
                  }}</el-tag></el-col
                >
              </el-row>
            </el-card>
            <el-card shadow="never" style="margin-bottom: 16px">
              <template #header><span style="font-weight: 600">账户操作</span></template>
              <el-row :gutter="12">
                <el-col :span="12"
                  ><el-button
                    style="width: 100%"
                    :loading="accountLoading"
                    type="warning"
                    plain
                    @click="handleResetPassword"
                    >重置密码</el-button
                  ></el-col
                >
                <el-col :span="12"
                  ><el-button
                    style="width: 100%"
                    :loading="accountLoading"
                    type="primary"
                    plain
                    @click="handleSendLoginCode"
                    >发送登录验证码</el-button
                  ></el-col
                >
              </el-row>
            </el-card>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="客户编号">{{ websiteAccount.customerCode }}</el-descriptions-item>
              <el-descriptions-item label="密码状态"
                ><el-tag :type="websiteAccount.hasPassword ? 'success' : 'warning'" size="small">{{
                  websiteAccount.hasPassword ? '已设置' : '未设置'
                }}</el-tag></el-descriptions-item
              >
              <el-descriptions-item label="注册时间">{{ websiteAccount.registeredAt || '—' }}</el-descriptions-item>
              <el-descriptions-item label="最后登录">{{ websiteAccount.lastLoginAt || '—' }}</el-descriptions-item>
              <el-descriptions-item label="累计订单">{{ websiteAccount.totalOrders || 0 }}</el-descriptions-item>
              <el-descriptions-item label="累计消费"
                >¥{{ Number(websiteAccount.totalAmount || 0).toFixed(2) }}</el-descriptions-item
              >
            </el-descriptions>
          </template>
        </el-tab-pane>
      </el-tabs>
    </template>
  </el-drawer>

  <!-- 联系人弹窗 -->
  <el-dialog v-model="contactDialogVisible" title="添加联系人" width="500px" destroy-on-close @closed="emit('refresh')">
    <el-form label-width="80px">
      <el-form-item label="姓名"><el-input v-model="contactForm.contactName" /></el-form-item>
      <el-form-item label="角色"><el-input v-model="contactForm.role" /></el-form-item>
      <el-form-item label="电话"><el-input v-model="contactForm.phone" /></el-form-item>
      <el-form-item label="邮箱"><el-input v-model="contactForm.email" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="contactDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleAddContact">确定</el-button>
    </template>
  </el-dialog>

  <!-- 地址弹窗 -->
  <el-dialog
    v-model="addressDialogVisible"
    :title="isEditAddress ? '编辑地址' : '新增地址'"
    width="500px"
    destroy-on-close
    @closed="emit('refresh')"
  >
    <el-form label-width="80px">
      <el-form-item label="类型"
        ><el-select v-model="addressForm.addressType"
          ><el-option label="收货" value="shipping" /><el-option label="结算" value="billing" /><el-option
            label="办公"
            value="office" /></el-select
      ></el-form-item>
      <el-form-item label="省份"><el-input v-model="addressForm.province" /></el-form-item>
      <el-form-item label="城市"><el-input v-model="addressForm.city" /></el-form-item>
      <el-form-item label="区县"><el-input v-model="addressForm.district" /></el-form-item>
      <el-form-item label="详细地址"><el-input v-model="addressForm.detailAddress" /></el-form-item>
      <el-form-item label="收件人"><el-input v-model="addressForm.receiverName" /></el-form-item>
      <el-form-item label="收件电话"><el-input v-model="addressForm.receiverPhone" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="addressDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSaveAddress">确定</el-button>
    </template>
  </el-dialog>

  <!-- 阶梯定价弹窗 -->
  <el-dialog v-model="tierDialogVisible" title="新增阶梯定价" width="500px" destroy-on-close @closed="emit('refresh')">
    <el-form label-width="80px">
      <el-form-item label="档位名称"><el-input v-model="tierForm.tierName" /></el-form-item>
      <el-form-item label="最小数量"><el-input-number v-model="tierForm.minQty" :min="1" /></el-form-item>
      <el-form-item label="最大数量"><el-input-number v-model="tierForm.maxQty" :min="1" /></el-form-item>
      <el-form-item label="折扣率"
        ><el-input-number v-model="tierForm.discountRate" :min="0" :max="1" :step="0.01"
      /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="tierDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleAddTierPricing">确定</el-button>
    </template>
  </el-dialog>

  <!-- 处方弹窗 -->
  <el-dialog
    v-model="prescriptionDialogVisible"
    title="新增处方"
    width="500px"
    destroy-on-close
    @closed="emit('refresh')"
  >
    <el-form label-width="80px">
      <el-form-item label="标签"><el-input v-model="prescriptionForm.label" /></el-form-item>
      <el-form-item label="OD球镜"><el-input-number v-model="prescriptionForm.odSphere" :step="0.25" /></el-form-item>
      <el-form-item label="OD柱镜"><el-input-number v-model="prescriptionForm.odCylinder" :step="0.25" /></el-form-item>
      <el-form-item label="OS球镜"><el-input-number v-model="prescriptionForm.osSphere" :step="0.25" /></el-form-item>
      <el-form-item label="OS柱镜"><el-input-number v-model="prescriptionForm.osCylinder" :step="0.25" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="prescriptionDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleAddPrescription">确定</el-button>
    </template>
  </el-dialog>

  <!-- 镜片弹窗 -->
  <el-dialog v-model="lensDialogVisible" title="新增镜片" width="500px" destroy-on-close @closed="emit('refresh')">
    <el-form label-width="80px">
      <el-form-item label="结构标准"><el-input v-model="lensForm.lensStandardCode" /></el-form-item>
      <el-form-item label="处方编号"><el-input v-model="lensForm.prescriptionId" /></el-form-item>
      <el-form-item label="购买日期"><el-input v-model="lensForm.purchaseDate" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="lensDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleAddLens">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCustomerDetail } from '@/composables/useCustomerDetail'
import { useCustomerOperations } from '@/composables/useCustomerOperations'
import { useCustomerUtils } from '@/composables/useCustomerUtils'

const props = defineProps<{
  visible: boolean
  customerId: string
}>()

const emit = defineEmits<{
  close: []
  refresh: []
}>()

const internalVisible = ref(false)

// ===== Composables =====
const {
  detail,
  contacts,
  addresses,
  tierPricings,
  prescriptions,
  customerLenses,
  lensSummary,
  customerOrders,
  orderTotal,
  orderPage,
  ordersLoading,
  memberLevelLogs,
  pointsTransactions,
  activeTab,
  upgradeProgress,
  nextLevelInfo,
  openDetail,
  loadCustomerOrders,
} = useCustomerDetail()

const {
  contactDialogVisible,
  contactForm,
  openContactDialog,
  handleAddContact,
  addressDialogVisible,
  isEditAddress,
  addressForm,
  openAddressDialog,
  openEditAddress,
  handleSaveAddress,
  handleDeleteAddress,
  tierDialogVisible,
  tierForm,
  openTierPricingDialog,
  handleAddTierPricing,
  prescriptionDialogVisible,
  prescriptionForm,
  openPrescriptionDialog,
  handleAddPrescription,
  handleDeletePrescription,
  lensDialogVisible,
  lensForm,
  openLensDialog,
  handleAddLens,
  handleDeleteLens,
  websiteAccount,
  loginLogs,
  loginLogsLoading,
  accountLoading,
  loadWebsiteAccount,
  loadLoginLogs,
  handleRegisterAccount,
  handleResetPassword,
  handleSendLoginCode,
  handleStatusChange,
} = useCustomerOperations(detail, contacts, addresses, tierPricings, prescriptions, customerLenses, lensSummary)

const _cu = useCustomerUtils()
const {
  typeTag,
  typeLabel,
  levelTag,
  referralLabel,
  subscriptionLabel,
  sourceTypeLabel,
  isExpired,
  addrTypeLabel,
  orderStatusTag,
  orderStatusLabel,
  accountLabel,
  statusType,
  memberLabel,
  formatDateTime,
  triggerTypeTag,
  triggerTypeLabel,
  pointsTypeTag,
  pointsTypeLabel,
} = _cu
void _cu // levelLabel, statusTag, statusLabel held for future template use

// ===== Tab 点击 =====
function onTabClick() {
  // Tab 切换时触发数据加载（如需要）
}

// ===== 数据加载 =====
watch(
  () => props.visible,
  async (val) => {
    internalVisible.value = val
    if (val && props.customerId) {
      await openDetail({ customerId: props.customerId })
      loadWebsiteAccount()
    }
  },
)

watch(
  () => props.customerId,
  async (id) => {
    if (id && internalVisible.value) {
      await openDetail({ customerId: id })
    }
  },
)
</script>

<style scoped>
.member-stat {
  text-align: center;
}
.member-stat-value {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}
.member-stat-label {
  font-size: 12px;
  color: #909399;
}
</style>
