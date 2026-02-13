import { isFunction } from '@mini-vue/shared'
import { ReactiveEffect } from './effect'
import { trackRefValue, triggerRefValue } from './ref'
import { DirtyLevels } from './constants'
import { DepMap } from './reactiveEffect'

export class ComputedRefImpl {
  public _value
  public _effect: ReactiveEffect
  public dep: DepMap
  constructor(public getter, public setter) {
    // 我们需要创建一个effect来管理当前计算属性的dirty属性
    this._effect = new ReactiveEffect(
      () => getter(this._value),
      () => {
        // 计算属性依赖的值变化了，我们应该触发渲染effect重新执行
        triggerRefValue(this) // 依赖的属性变化后，需要触发重新渲染，还需要将dirty变为true
        this._effect._dirtyLevel = DirtyLevels.Dirty
      }
    )
  }

  // 让计算属性收集对应的effect
  get value() {
    // 检查计算属性是否为脏值（需要重新计算）
    // 默认取值一定是脏的，但是执行一次run之后就不脏了
    if (this._effect.dirty) {
      // 执行effect的run方法，重新计算值
      this._value = this._effect.run()
      // 收集依赖当前计算属性的其他effect
      trackRefValue(this)
    }
    // 无论是否重新计算，都返回缓存的计算结果
    return this._value
  }

  set value(v) {
    // 这个就是ref的setter
    this.setter(v)
  }
}

export function computed(getterOrOptions) {
  let onlyGetter = isFunction(getterOrOptions)

  let getter
  let setter
  // 如果是函数
  if (onlyGetter) {
    getter = getterOrOptions
    setter = () => {}
  } else {
    // 否则是对象
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }
  return new ComputedRefImpl(getter, setter) // 计算属性ref
}
