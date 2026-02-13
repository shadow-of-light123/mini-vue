import { isObject } from '@mini-vue/shared'
import { track, trigger } from './reactiveEffect'
import { reactive } from './reactive'
import { ReactiveFlags } from './constants'

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
    let res = Reflect.get(target, key, receiver)
    if (isObject(res)) {
      // 当取的值也是对象的时候，需要对这个对象再进行代理，递归代理，返回该对象的代理对象
      return reactive(res)
    }
    return res
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
