'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const DarkModeContext = createContext({ isDark: false, toggle: () => {} })

export function DarkModeProvider({ children }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved === 'true') setIsDark(true)
  }, [])

  const toggle = () => {
    setIsDark(prev => {
      localStorage.setItem('darkMode', String(!prev))
      return !prev
    })
  }

  return (
    <DarkModeContext.Provider value={{ isDark, toggle }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export const useDarkMode = () => useContext(DarkModeContext)
