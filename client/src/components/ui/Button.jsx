import React from 'react'
export default function Button({ variant='default', className='', children, ...props }) {
  const ripple = variant === 'primary'
  const hasTitle = !!props.title
  const cls = ['btn', variant==='primary'?'primary':'', variant==='ghost'?'btn-ghost':'', ripple?'btn-ripple':'', hasTitle?'has-tooltip':'', className].filter(Boolean).join(' ')
  return <button className={cls} {...props}>{children}</button>
}
