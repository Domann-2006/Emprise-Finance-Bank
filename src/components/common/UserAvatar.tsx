import React from 'react';
import { UserProfile } from '../../types';

export interface UserAvatarProps {
  user?: Partial<UserProfile> | { name?: string; photoDataUrl?: string } | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  roundedClassName?: string;
  alt?: string;
}

const SIZE_MAP: Record<NonNullable<UserAvatarProps['size']>, { container: string; text: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]' },
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-12 h-12', text: 'text-base' },
  xl: { container: 'w-14 h-14', text: 'text-lg' },
  '2xl': { container: 'w-16 h-16', text: 'text-xl' },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  roundedClassName = 'rounded-full',
  alt,
}) => {
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
  const initial = user?.name?.trim() ? user.name.trim()[0].toUpperCase() : 'U';

  if (user?.photoDataUrl) {
    return (
      <img
        src={user.photoDataUrl}
        alt={alt || user.name || 'User profile photo'}
        className={`${sizeConfig.container} ${roundedClassName} object-cover shrink-0 select-none ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeConfig.container} ${roundedClassName} bg-primary-container/20 text-primary font-bold ${sizeConfig.text} flex items-center justify-center shrink-0 select-none ${className}`}
      aria-label={alt || user?.name || 'User avatar'}
    >
      {initial}
    </div>
  );
};
