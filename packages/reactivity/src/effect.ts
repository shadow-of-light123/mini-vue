import type { DepMap } from './reactiveEffect'

export function effect(fn: () => any, options?: any) {
  // 创建一个响应式effect 数据变化后可以重新执行
  // 只要依赖的属性值变化了就要执行回调
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run() // 第一次new的时候这行的run不会执行
  })
  _effect.run() // 所以这里是第一次执行

  if (options) {
    // 浅拷贝
    // 用用户传递的覆盖掉内置的
    Object.assign(_effect, options)
  }

  const runner = _effect.run.bind(_effect)

  runner.effect = _effect // 可以在run方法上获取到effect的引用
  return runner // 外界可以自己让其重新run
}

function preCleanEffect(effect: ReactiveEffect) {
  effect._depslength = 0
  effect._trackId++ // 每次执行id 都是+1 如果当前同一个effect执行，id就是相同的effect._trackId
}

function postCleanEffect(effect: ReactiveEffect) {
  while (effect._depslength < effect.deps.length) {
    const dep = effect.deps.pop() // 从deps数组中清除
    if (dep) {
      cleanDepEffect(dep, effect) // 删除dep映射表中对应的effect
    }
  }
}

export let activeEffect: ReactiveEffect

export class ReactiveEffect {
  _trackId = 0 // 用于记录当前effect执行了几次
  deps: Array<DepMap> = []
  _depslength = 0
  _running = 0

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

      // effect重新执行前，需要清理上一次的依赖  effect.deps
      preCleanEffect(this)
      this._running++

      // 依赖收集 -> state.name  state.age
      return this.fn()
    } finally {
      // 新的依赖（deps数组元素）少于旧的依赖时，清理未被重新收集的残留依赖
      // 依赖更新完毕之后，最后清理，所以放在finally块中
      postCleanEffect(this)
      activeEffect = lastEffect
      // 防止嵌套
      this._running--
    }
  }
}

function cleanDepEffect(dep: DepMap, effect: ReactiveEffect) {
  dep.delete(effect)
  if (dep.size === 0) {
    dep.cleanup() // 如果map为空,则删除这个属性
  }
}

// 双向记忆
export function trackEffect(effect: ReactiveEffect, dep: DepMap) {
  // 需要重新收集依赖，将不需要的effect移除掉

  // 每次触发新的effect时，id++，更新id
  if (dep.get(effect) !== effect._trackId) {
    dep.set(effect, effect._trackId) // 更新id

    // {flag, name}
    // {flag, age}

    let oldDep = effect.deps[effect._depslength]

    // 如果老的dep和当前的activeEffect的dep不一样
    if (oldDep !== dep) {
      if (oldDep) {
        // 如果老的有值，删除老的
        cleanDepEffect(oldDep, effect)
        effect.deps.pop() // 从deps数组中移除oldDep
        effect._depslength-- // 更新依赖计数
      }
      // 将当前的dep放入数组中,换成新的
      effect.deps.push(dep)
      effect._depslength++
    } else {
      effect._depslength++
    }
  }

  // dep.set(effect, effect._trackId)
  // // 还要让effect和dep关联起来
  // effect.deps.push(dep)
  // effect._depslength++
}

export function triggerEffects(dep: DepMap) {
  for (const effect of dep.keys()) {
    // 如果不是正在执行，才能执行
    if (!effect._running) {
      if (effect.scheduler) {
        effect.scheduler() // -> effect.run()
      }
    }
  }
}
