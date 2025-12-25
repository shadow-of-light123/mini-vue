export function effect(fn: () => any, options?: any) {
  // 创建一个响应式effect 数据变化后可以重新执行
  // 只要依赖的属性值变化了就要执行回调
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run() // 第一次new的时候这行的run不会执行
  })
  _effect.run() // 所以这里是第一次执行

  return _effect
}

export class ReactiveEffect {
  _trackId = 0 // 用于记录当前effect执行了几次
  deps: Array<Map<ReactiveEffect, number>> = []
  _depslength = 0

  public active = true // 创建的effect是响应式的
  // fn 用户编写的函数
  // 如果fn中依赖的数据发生变化后，需要重新调用scheduler -> run()
  public fn: () => any
  public scheduler: () => any
  constructor(fn: () => any, scheduler: () => any) {
    this.fn = fn
    this.scheduler = scheduler
  }
  run() {
    // 让fn执行
    if (!this.active) {
      return this.fn() // 不是激活的，执行后，什么都不用做
    }
    let lastEffect = activeEffect
    try {
      activeEffect = this
      // 依赖收集 -> state.name  state.age
      return this.fn()
    } finally {
      activeEffect = lastEffect
    }
  }
}

export let activeEffect: ReactiveEffect

// 双向记忆
export function trackEffect(
  effect: ReactiveEffect,
  dep: Map<ReactiveEffect, number>
) {
  dep.set(effect, effect._trackId)
  // 还要让effect和dep关联起来
  effect.deps.push(dep)
  effect._depslength++
}

export function triggerEffects(dep: Map<ReactiveEffect, number>) {
  for (const effect of dep.keys()) {
    if (effect.scheduler) {
      effect.scheduler() // -> effect.run()
    }
  }
}
