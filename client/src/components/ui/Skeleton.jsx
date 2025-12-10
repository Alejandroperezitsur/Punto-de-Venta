import React from 'react'
export default function Skeleton({ lines=3 }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_,i)=>(<div key={i} className="skeleton" style={{ height: 14, marginBottom: 8 }} />))}
    </div>
  )
}
