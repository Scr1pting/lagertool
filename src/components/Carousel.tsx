import { useCallback, useEffect, useState } from 'react';
import { IoIosArrowRoundForward, IoIosArrowRoundBack } from 'react-icons/io';

import clsx from 'clsx';

import styles from './Carousel.module.css';

interface CarouselProps {
    items: Array<React.ReactNode>;
    initialIndex?: number;
    loop?: boolean;
    ariaLabel?: string;
    className?: string;
    onIndexChange?: (index: number) => void;
}

function Carousel({
    items,
    initialIndex = 0,
    loop = true,
    ariaLabel = 'Carousel',
    className,
    onIndexChange,
}: CarouselProps) {
    const itemCount = items.length;

    const [activeIndex, setActiveIndex] = useState(() => {
        if (itemCount === 0) return 0;
        return Math.min(Math.max(initialIndex, 0), itemCount - 1);
    });

    useEffect(() => {
        if (itemCount === 0) return;

        setActiveIndex((previous) => {
            if (previous < itemCount) return previous;
            return Math.max(itemCount - 1, 0);
        });
    }, [itemCount]);

    const updateIndex = useCallback(
        (nextIndex: number) => {
            if (itemCount === 0) return;

            let resolvedIndex = nextIndex;

            if (loop) {
                resolvedIndex = (nextIndex + itemCount) % itemCount;
            } else {
                resolvedIndex = Math.min(Math.max(nextIndex, 0), itemCount - 1);
            }

            setActiveIndex(resolvedIndex);
            onIndexChange?.(resolvedIndex);
        },
        [itemCount, loop, onIndexChange],
    );

    const handlePrevious = useCallback(() => {
        if (activeIndex === 0) {
            updateIndex(items.length - 1);
        } else {
            updateIndex(activeIndex -1);
        }
    }, [activeIndex, updateIndex]);

    const handleNext = useCallback(() => {
        if (activeIndex === items.length) {
            updateIndex(0);
        } else {
            updateIndex(activeIndex + 1);
        }
    }, [activeIndex, updateIndex]);

    if (itemCount === 0) {
        return null;
    }

    return (
        <section
            className={clsx(styles.carousel, className)}
            aria-roledescription="carousel"
            aria-label={ariaLabel}
        >
            <button
                type="button"
                className={clsx(styles.navButton, styles.navButtonLeft)}
                onClick={handlePrevious}
                aria-label="Previous item"
            >
                <IoIosArrowRoundBack />
            </button>

            <div className={styles.viewport}>
                <div
                    className={styles.track}
                    style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                >
                    {items.map((item, index) => (
                        <div
                            key={index}
                            role="tabpanel"
                            aria-hidden={index !== activeIndex}
                            className={styles.slide}
                        >
                            {item}
                        </div>
                    ))}
                </div>
            </div>

            <button
                type="button"
                className={clsx(styles.navButton, styles.navButtonRight)}
                onClick={handleNext}
                aria-label="Next item"
            >  
                <IoIosArrowRoundForward />
            </button>
        </section>
    );
}

export default Carousel;
