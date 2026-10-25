const HISTORY_KEY = 'repack_history'

function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return h + ':' + m + ':' + s
}

/**
 * 过滤输入：只保留数字和一个小数点
 */
function filterDigit(val) {
  // 只保留数字和小数点
  let filtered = val.replace(/[^0-9.]/g, '')
  // 只保留第一个小数点
  const dotIndex = filtered.indexOf('.')
  if (dotIndex >= 0) {
    filtered = filtered.substring(0, dotIndex + 1) + filtered.substring(dotIndex + 1).replace(/\./g, '')
  }
  return filtered
}

Page({
  data: {
    currentMode: '4to3',

    // 原始信息
    pricePerJin: '',
    totalWeight: '',
    totalPrice: 0,

    // 显示格式化
    pricePerJinDisplay: '0.00',
    totalWeightDisplay: '0.00',
    totalPriceDisplay: '0.00',

    // 重包装信息
    weightList: [
      { weight: '', price: 0, priceDisplay: '0.00' },
      { weight: '', price: 0, priceDisplay: '0.00' },
      { weight: '', price: 0, priceDisplay: '0.00' }
    ],

    repackTotalWeight: 0,
    repackUnitPrice: 0,
    repackTotalWeightDisplay: '0.00',
    repackUnitPriceDisplay: '0.00',

    // 历史记录
    historyList: []
  },

  onLoad() {
    this.loadHistory()
    // 显式开启分享按钮
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  onShow() {
    this.loadHistory()
  },

  /**
   * 启用转发给好友
   */
  onShareAppMessage() {
    return {
      title: '商品 - 重新包装计算器',
      path: '/pages/index/index',
      imageUrl: '/static/icon.png'
    }
  },

  /**
   * 启用分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: '商品 - 重新包装计算器',
      imageUrl: '/static/icon.png'
    }
  },

  /**
   * 切换包装方式
   */
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.currentMode) return

    const count = mode === '4to3' ? 3 : 2
    const weightList = []
    for (let i = 0; i < count; i++) {
      weightList.push({ weight: '', price: 0, priceDisplay: '0.00' })
    }

    this.setData({
      currentMode: mode,
      weightList,
      repackTotalWeight: 0,
      repackUnitPrice: 0,
      repackTotalWeightDisplay: '0.00',
      repackUnitPriceDisplay: '0.00'
    })
  },

  /**
   * 输入每斤单价
   */
  onPricePerJinInput(e) {
    const val = filterDigit(e.detail.value)
    const numVal = parseFloat(val) || 0
    this.setData({
      pricePerJin: val,
      pricePerJinDisplay: numVal.toFixed(2)
    })
    this.calcTotalPrice()
  },

  /**
   * 输入总重量
   */
  onTotalWeightInput(e) {
    const val = filterDigit(e.detail.value)
    const numVal = parseFloat(val) || 0
    this.setData({
      totalWeight: val,
      totalWeightDisplay: numVal.toFixed(2)
    })
    this.calcTotalPrice()
  },

  /**
   * 计算总价：总价 = 总重量 × 每斤单价
   */
  calcTotalPrice() {
    const pricePerJin = parseFloat(this.data.pricePerJin) || 0
    const totalWeight = parseFloat(this.data.totalWeight) || 0
    const totalPrice = totalWeight * pricePerJin

    this.setData({
      totalPrice,
      totalPriceDisplay: totalPrice.toFixed(2)
    })

    this.calcRepack()
  },

  /**
   * 输入重包装重量
   */
  onWeightInput(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    const val = filterDigit(e.detail.value)
    const weightList = this.data.weightList
    weightList[index].weight = val
    this.setData({ weightList })
    this.calcRepack()
  },

  /**
   * 计算重包装后的各项数据 + 自动保存历史
   */
  calcRepack() {
    const totalPrice = this.data.totalPrice || 0
    const weightList = this.data.weightList

    let repackTotalWeight = 0
    let allFilled = true
    for (let i = 0; i < weightList.length; i++) {
      const w = parseFloat(weightList[i].weight) || 0
      repackTotalWeight += w
      if (!weightList[i].weight || weightList[i].weight === '') {
        allFilled = false
      }
    }

    let repackUnitPrice = 0
    if (repackTotalWeight > 0) {
      repackUnitPrice = totalPrice / repackTotalWeight
    }

    for (let i = 0; i < weightList.length; i++) {
      const w = parseFloat(weightList[i].weight) || 0
      const p = w * repackUnitPrice
      weightList[i].price = p
      weightList[i].priceDisplay = p.toFixed(2)
    }

    this.setData({
      weightList,
      repackTotalWeight,
      repackUnitPrice,
      repackTotalWeightDisplay: repackTotalWeight.toFixed(2),
      repackUnitPriceDisplay: repackUnitPrice.toFixed(2)
    })
  },

  /**
   * 重新计算：先保存当前结果到历史，再清空重量输入
   */
  recalculate() {
    const totalPrice = this.data.totalPrice
    const repackTotalWeight = this.data.repackTotalWeight
    const repackUnitPrice = this.data.repackUnitPrice

    // 有有效结果时才保存并提示
    if (totalPrice > 0 && repackTotalWeight > 0 && repackUnitPrice > 0) {
      this.saveHistory()
      wx.showToast({ title: '已保存历史', icon: 'success', duration: 1000 })
    }

    // 清空总重量和所有份重量，保留单价
    const weightList = this.data.weightList.map(() => ({
      weight: '',
      price: 0,
      priceDisplay: '0.00'
    }))

    this.setData({
      totalWeight: '',
      totalWeightDisplay: '0.00',
      totalPrice: 0,
      totalPriceDisplay: '0.00',
      weightList,
      repackTotalWeight: 0,
      repackUnitPrice: 0,
      repackTotalWeightDisplay: '0.00',
      repackUnitPriceDisplay: '0.00'
    })
  },

  /**
   * 保存当前计算到本地历史（去重：与上一条相同时不重复保存）
   */
  saveHistory() {
    const historyList = wx.getStorageSync(HISTORY_KEY) || []
    const now = formatTime(new Date())
    const modeLabel = this.data.currentMode === '4to3' ? '4颗分3份' : '3颗分2份'

    // 收集每份的重量和价格
    const portions = this.data.weightList
      .filter(item => parseFloat(item.weight) > 0)
      .map((item, i) => ({
        idx: i + 1,
        weight: (parseFloat(item.weight) || 0).toFixed(2),
        price: item.priceDisplay
      }))

    const record = {
      time: now,
      modeLabel,
      totalPrice: this.data.totalPriceDisplay,
      totalWeight: this.data.totalWeightDisplay,
      pricePerJin: this.data.pricePerJinDisplay,
      repackWeight: this.data.repackTotalWeightDisplay,
      unitPrice: this.data.repackUnitPriceDisplay,
      portions
    }

    // 如果和最新一条完全一致，跳过
    if (historyList.length > 0) {
      const last = historyList[0]
      if (
        last.totalPrice === record.totalPrice &&
        last.totalWeight === record.totalWeight &&
        last.pricePerJin === record.pricePerJin &&
        last.repackWeight === record.repackWeight &&
        last.unitPrice === record.unitPrice
      ) {
        return
      }
    }

    historyList.unshift(record)

    // 最多保留 20 条
    if (historyList.length > 20) {
      historyList.length = 20
    }

    wx.setStorageSync(HISTORY_KEY, historyList)
    this.setData({ historyList })
  },

  /**
   * 加载历史记录
   */
  loadHistory() {
    const historyList = wx.getStorageSync(HISTORY_KEY) || []
    this.setData({ historyList })
  },

  /**
   * 清空历史记录
   */
  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有计算历史吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync(HISTORY_KEY)
          this.setData({ historyList: [] })
          wx.showToast({ title: '已清空', icon: 'success', duration: 1200 })
        }
      }
    })
  }
})
