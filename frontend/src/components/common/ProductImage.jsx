import React, { useState } from 'react'
import { Package, Milk, Coffee, Flame, Sparkles, ShoppingBag, Cookie, ShieldCheck } from 'lucide-react'

const CATEGORY_THEMES = {
  Dairy: {
    bg: 'from-blue-500/15 to-cyan-500/20 text-blue-600 border-blue-200',
    icon: Milk,
    label: 'Dairy'
  },
  Grocery: {
    bg: 'from-amber-500/15 to-emerald-500/20 text-amber-700 border-amber-200',
    icon: ShoppingBag,
    label: 'Grocery'
  },
  Beverages: {
    bg: 'from-purple-500/15 to-indigo-500/20 text-purple-600 border-purple-200',
    icon: Coffee,
    label: 'Beverages'
  },
  Spices: {
    bg: 'from-rose-500/15 to-orange-500/20 text-rose-600 border-rose-200',
    icon: Flame,
    label: 'Spices'
  },
  Snacks: {
    bg: 'from-amber-400/20 to-yellow-500/20 text-amber-800 border-amber-300',
    icon: Cookie,
    label: 'Snacks'
  },
  'Home Care': {
    bg: 'from-teal-500/15 to-emerald-500/20 text-teal-700 border-teal-200',
    icon: Sparkles,
    label: 'Home Care'
  },
  'Personal Care': {
    bg: 'from-pink-500/15 to-rose-500/20 text-pink-600 border-pink-200',
    icon: ShieldCheck,
    label: 'Personal Care'
  }
}

export default function ProductImage({
  src,
  alt = 'Product',
  category = 'Grocery',
  className = 'w-12 h-12 rounded-xl',
  imgClassName = 'w-full h-full object-cover rounded-xl'
}) {
  const [hasError, setHasError] = useState(false)

  // Find theme for category or default to Grocery
  const theme = CATEGORY_THEMES[category] || CATEGORY_THEMES.Grocery
  const CategoryIcon = theme.icon || Package

  // Initials for badge
  const initials = alt
    ? alt.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'P'

  if (hasError || !src || typeof src !== 'string' || src.trim() === '') {
    return (
      <div 
        className={`${className} bg-gradient-to-br ${theme.bg} border flex flex-col items-center justify-center p-1 relative overflow-hidden select-none shrink-0 shadow-2xs`}
        title={`${alt} (${category})`}
      >
        <CategoryIcon className="w-4 h-4 opacity-75 shrink-0" />
        <span className="text-[9px] font-black tracking-wider leading-none mt-0.5 truncate max-w-full px-0.5 opacity-90">
          {initials}
        </span>
      </div>
    )
  }

  return (
    <div className={`${className} relative overflow-hidden shrink-0 bg-slate-100`}>
      <img
        src={src}
        alt={alt}
        className={imgClassName}
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  )
}

