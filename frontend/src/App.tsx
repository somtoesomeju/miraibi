import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <h1>Miraibi Frontend</h1>
        <p>React + TypeScript frontend for Miraibi BI tool</p>
      </div>
    </>
  )
}

export default App