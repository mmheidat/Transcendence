import React, { useState } from 'react';

interface AvatarImageProps {
    src?: string;
    alt?: string;
    fallbackText: string;
    className?: string;
    containerClassName?: string;
}

/**
 * Avatar image component with lazy loading and error fallback.
 * If the image fails to load (e.g., 429 rate limit), it shows initials instead.
 */
const AvatarImage: React.FC<AvatarImageProps> = ({
    src,
    alt = '',
    fallbackText,
    className = 'w-full h-full object-cover',
    containerClassName = ''
}) => {
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Generate initials from fallback text
    const initials = fallbackText.substring(0, 2).toUpperCase();

    // If no src or error occurred, show fallback
    if (!src || hasError) {
        return (
            <div className={`flex items-center justify-center bg-gradient-to-br from-gray-600 to-gray-800 ${containerClassName}`}>
                <span className="text-white font-bold">{initials}</span>
            </div>
        );
    }

    return (
        <>
            {isLoading && (
                <div className={`absolute inset-0 flex items-center justify-center bg-gray-700 ${containerClassName}`}>
                    <span className="text-gray-400 font-bold">{initials}</span>
                </div>
            )}
            <img
                src={src}
                alt={alt}
                loading="lazy"
                className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                    setHasError(true);
                    setIsLoading(false);
                }}
            />
        </>
    );
};

export default AvatarImage;
