import { activeEffect } from './effect'
import { track, trigger } from './reactiveEffect'

export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive', // 基本上唯一
}

// proxy 需要搭配 reflect 来使用
export const mutableHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }

    // 当取值的时候 应该让响应式属性和 effect 映射起来
    // 依赖收集
    track(target, key) // 收集这个对象的这个属性，和effect关联在一起

    // reflect.get(target,key) === target[key]
    // 用了这个方法可以将 getter 中的 this 指向 receiver ，从而保证能及时响应到 target 对象中的所有属性
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    // 找到属性 让对应的effect重新执行
    let oldValue = target[key]

    let result = Reflect.set(target, key, value, receiver)
    if (oldValue !== value) {
      // 需要触发页面更新
      trigger(target, key, value, oldValue)
    }

    // 触发更新
    // TODO
    // Reflect.set(target, key, value) === target[key] = value
    return result
  },
}
