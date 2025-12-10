import React from 'react'
export default function Input({ label, className='', inputRef=null, ...props }) {
  return (
    <div className="field">
      {label && <span className="label">{label}</span>}
      <input ref={inputRef} className={`input ${className}`} {...props} />
    </div>
  )
}
