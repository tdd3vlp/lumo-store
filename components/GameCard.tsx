import Link from "next/link";

type Props = {
  id: number;
  title: string;
  price: number;
  image: string;
};

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function GameCard({ id, title, price, image }: Props) {
  return (
    <Link
      href={`/game/${id}`}
      className="group block w-[148px] shrink-0 sm:w-[160px] md:w-[172px] lg:w-[184px] xl:w-[196px]"
    >
      <div className="overflow-hidden rounded-[24px] border border-white/50 bg-white/40 shadow-[0_12px_24px_rgba(120,92,170,0.10)] backdrop-blur-xl">
        <div className="aspect-[3/4] overflow-hidden">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
          />
        </div>
      </div>

      <div className="mt-3 px-1">
        <div className="mb-1 text-base font-bold text-[#7c4dff] md:text-lg">
          {formatINR(price)}
        </div>

        <h3 className="line-clamp-2 min-h-[44px] text-sm font-semibold leading-5 text-[#2a1f44] md:min-h-[48px] md:text-base md:leading-6">
          {title}
        </h3>
      </div>
    </Link>
  );
}
