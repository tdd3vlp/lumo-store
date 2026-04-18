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
      className="group block w-[160px] shrink-0 sm:w-[170px] md:w-[180px] lg:w-[190px] xl:w-[200px]"
    >
      <div className="overflow-hidden rounded-[22px] border border-white/40 bg-white/30 shadow-[0_10px_24px_rgba(120,92,170,0.10)] backdrop-blur-xl">
        <div className="aspect-[2/3] overflow-hidden">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
          />
        </div>
      </div>

      <div className="mt-3 px-1">
        <div className="mb-1 text-[15px] font-bold text-[#7c4dff] md:text-base">
          {formatINR(price)}
        </div>

        <h3 className="line-clamp-2 min-h-[40px] text-sm font-semibold leading-5 text-[#2a1f44] md:min-h-[44px] md:text-[15px]">
          {title}
        </h3>
      </div>
    </Link>
  );
}
