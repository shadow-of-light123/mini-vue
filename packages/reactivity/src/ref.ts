// reactive shallowReactive

import { activeEffect, trackEffect, triggerEffects } from './effect'
import { toReactive } from './reactive'
import { createDep } from './reactiveEffect'

// ref shallowRef
export function ref(value: any) {
  return createRef(value)
}

function createRef(value: any) {
  return new RefImpl(value)
}

class RefImpl {
  __v_isRef = true // 增加ref标识
  _value // 用来保存ref的值
  dep // 用于收集对应的effect
  constructor(public _rawValue) {
    this._value = toReactive(_rawValue)
  }

  get value() {
    trackRefValue(this)
    return this._value
  }
  set value(newValue) {
    if (newValue !== this._rawValue) {
      this._rawValue = newValue // 更新值
      this._value = toReactive(newValue)
      triggerRefValue(this)
    }
  }
}

function trackRefValue(ref: RefImpl) {
  if (activeEffect) {
    ref.dep = createDep(() => (ref.dep = undefined), 'undefined')
    trackEffect(activeEffect, ref.dep)
  }
}

function triggerRefValue(ref: RefImpl) {
  let dep = ref.dep
  if (dep) {
    triggerEffects(dep)
  }
}

class ObjectRefImpl {
  __v_isRef = true // 增加ref标识
  constructor(public _object, public _key) {}
  get value() {
    return this._object[this._key]
  }
  set value(newValue) {
    this._object[this._key] = newValue
  }
}

export function toRef(object: any, key: any) {
  return new ObjectRefImpl(object, key)
}

export function toRefs(object: any) {
  const res = {}
  // 挨个属性调用toRef
  for (let key in object) {
    res[key] = toRef(object, key)
  }
  return res
}

/**
 * 创建一个自动脱 ref 的代理对象
 * @param objectWithRef 包含 ref 类型属性的对象
 * @returns 代理后的对象，访问 ref 属性时自动返回其 value 值
 */
export function proxyRef(objectWithRef: any) {
  // 创建代理对象，实现自动脱 ref 功能
  return new Proxy(objectWithRef, {
    /**
     * 拦截对象属性读取操作
     * @param target 目标对象
     * @param key 要读取的属性名
     * @param receiver 代理对象本身
     * @returns 属性值，如果是 ref 则自动返回其 value 属性
     */
    get(target, key, receiver) {
      // 正常读取目标对象的属性值
      let r = Reflect.get(target, key, receiver)
      // 如果属性值存在且是 ref 类型，则自动返回其 value 值（自动脱 ref）
      return r && r.__v_isRef ? r.value : r
    },

    /**
     * 拦截对象属性设置操作
     * @param target 目标对象
     * @param key 要设置的属性名
     * @param value 新的属性值
     * @param receiver 代理对象本身
     * @returns 设置是否成功
     */
    set(target, key, value, receiver) {
      // 获取旧的属性值
      const oldValue = target[key]
      // 如果旧值存在且是 ref 类型
      if (oldValue && oldValue.__v_isRef) {
        // 直接更新 ref 的 value 属性
        oldValue.value = value
        return true
      } else {
        // 否则执行正常的属性设置操作
        return Reflect.set(target, key, value, receiver)
      }
    },
  })
}
