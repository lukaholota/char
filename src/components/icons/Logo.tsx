import Image from "next/image";

export const Logo = () => {
  return (
    <div className="relative h-10 w-10 overflow-hidden">
      <Image
        src="/images/logo-new.png"
        alt="logo"
        fill
        style={{  // Ось тут магія – style замість className для фіту
          objectFit: 'contain'
        }}
        sizes="40px"  // Опціонально, для маленького лого, щоб не лагало на мобілці
      />
    </div>
  )
}