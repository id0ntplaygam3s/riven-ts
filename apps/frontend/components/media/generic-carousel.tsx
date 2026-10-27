import Link from "next/link";
import React from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "#components/_ui/carousel.tsx";
import { PortraitCard } from "#components/portrait-card/portrait-card.tsx";

export interface GenericCarouselItem {
  id: string;
  title: string;
  subtitle?: string;
  image: string | null;
  href?: string;
}

interface GenericMediaCarouselProps {
  items: GenericCarouselItem[];
}

export function GenericMediaCarousel({ items }: GenericMediaCarouselProps) {
  return (
    <Carousel opts={{ dragFree: true, slidesToScroll: "auto" }}>
      <CarouselContent className="-ml-3">
        {items.map((item) => (
          <React.Fragment key={item.id}>
            <CarouselItem className="basis-auto pl-3">
              {item.href ? (
                <Link
                  href={item.href}
                  className="group relative block opacity-80 transition-all duration-300 hover:opacity-100"
                >
                  <PortraitCard
                    title={item.title}
                    subtitle={item.subtitle}
                    image={item.image}
                    className="w-36 md:w-44 lg:w-48"
                  />
                </Link>
              ) : (
                <PortraitCard
                  title={item.title}
                  subtitle={item.subtitle}
                  image={item.image}
                  className="w-36 md:w-44 lg:w-48"
                />
              )}
            </CarouselItem>
          </React.Fragment>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
