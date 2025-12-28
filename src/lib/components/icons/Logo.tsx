import Image from "next/image";

export const Logo = ({ className }: { className?: string }) => {
  const sizeClassName = className ?? "h-10 w-10";

  return (
    <div className={`relative overflow-hidden ${sizeClassName}`}>
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