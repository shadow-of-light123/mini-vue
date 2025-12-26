import {
  activeEffect,
  trackEffect,
  ReactiveEffect,
  triggerEffects,
} from './effect'

// 模块级别共享的targetMap，所有track调用共享同一个实例
// 存放依赖收集的关系
const targetMap = new WeakMap()

// export function createDep(effect?) {
//   const dep = new Set(effect)
//   return dep
// }

// 定义增强的Map类型接口
export interface DepMap extends Map<ReactiveEffect, number> {
  cleanup: () => void
  name: string | symbol
}

// 对象的map里有键的map，键的map里有effect的map
export const createDep = (
  cleanup: () => void,
  key: string | symbol
): DepMap => {
  const dep = new Map<ReactiveEffect, number>() as DepMap
  dep.cleanup = cleanup
  dep.name = key // 自定义的为了标识这个映射表是给哪个属性服务的
  return dep
}

export function track(target, key) {
  // activeEffect 有这个属性 说明这个key是在effect中访问的，没有说明在effect之外访问的，不用进行收集
  if (activeEffect) {
    let depsMap = targetMap.get(target)

    if (!depsMap) {
      // 新增的
      targetMap.set(target, (depsMap = new Map()))
    }

    let dep = depsMap.get(key)

    if (!dep) {
      // () => depsMap.delete(key) 清理映射表的cleanup函数
      dep = createDep(() => depsMap.delete(key), key)
      depsMap.set(key, dep)
    }

    // 将当前的effect放入到dep（映射表）中，后续可以根据值的变化触发此dep中存放的effect
    trackEffect(activeEffect, dep)
  }
}

export function trigger(target, key, value, oldValue) {
  const depsMap = targetMap.get(target)

  if (!depsMap) {
    // 找不到map，直接return即可
    return
  }

  let dep = depsMap.get(key)
  if (dep) {
    // 修改的属性对应了effect
    triggerEffects(dep)
  }
}
