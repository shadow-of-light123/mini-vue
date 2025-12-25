import { isObject } from '@mini-vue/shared'
import { ReactiveFlags, mutableHandlers } from './baseHandler'

// 用于记录我们的 代理后的结果， 可以复用 （保证同一个对象不会重复代理）
const reactiveMap = new WeakMap()

export function reactive(target) {
  return createReactiveObject(target)
}

function createReactiveObject(target) {
  // 统一做判断，响应式对象必须是对象才可以
  if (!isObject(target)) {
    return target
  }

  // 如果对象没有被代理，即原本的target对象上没有ReactiveFlags.IS_REACTIVE属性，
  // 故会返回undefined 放行
  // 而如果对象被代理了，则会触发get拦截器
  // 此时的key就是ReactiveFlags.IS_REACTIVE
  // 正好符合get拦截器中的判断key === ReactiveFlags.IS_REACTIVE，故return true
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target
  }

  // 取缓存，如果有就直接返回
  const existProxy = reactiveMap.get(target)
  if (existProxy) {
    return existProxy
  }
  const proxy = new Proxy(target, mutableHandlers)
  // 根据对象缓存代理后的结果
  reactiveMap.set(target, proxy)
  return proxy
}
