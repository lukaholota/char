"use client";

interface Props {
  title: string;
  onClick: () => void;
  bg?: string;
  variant?: 'primary' | 'secondary';
}

export const Button = ({ title, onClick, bg='bg-slate-600', variant='primary' }: Props ) => {
  return (
    <button className={`rounded-xl p-2 ${variant === 'primary' ? bg : 'border bg-violet-600 border-violet-400'}`} onClick={onClick}>
      {title}
    </button>
  )
}