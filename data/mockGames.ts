export type GameEdition = {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
};

export type Game = {
  id: number;
  region?: "IN" | "TR";
  title: string;
  image: string;
  price: number;
  originalPrice: number;
  description: string;
  platform: string;
  russianVoice: boolean;
  russianSubtitles: boolean;
  rating: number | null;
  releaseDate: string;
  psStoreUrl?: string;
  editions: GameEdition[];
  screenshots: string[];
};

export const games: Game[] = [
  {
    id: 1,
    title: "Cyberpunk 2077",
    image:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/library_600x900_2x.jpg",
    price: 1499,
    originalPrice: 2999,
    description:
      "Исследуй Найт-Сити — огромный мегаполис будущего, где власть, импланты и улицы определяют правила игры. История, экшен и свобода выбора объединяются в одном мире.",
    platform: "PS5",
    russianVoice: true,
    russianSubtitles: true,
    rating: null,
    releaseDate: "26 September 2023",
    editions: [
      {
        id: "standard",
        name: "Standard Edition",
        price: 1499,
        originalPrice: 2999,
      },
      {
        id: "ultimate",
        name: "Ultimate Edition",
        price: 2399,
        originalPrice: 3999,
      },
    ],
    screenshots: [
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/ss_2f649b68d579bf87011487d29bc4ccbfdd97d34f.600x338.jpg",
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/ss_0e64170751e1ae20ff8fdb7001a8892fd48260e7.600x338.jpg",
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/ss_af2804aa4bf35d4251043744412ce3b359a125ef.600x338.jpg",
    ],
  },
  {
    id: 2,
    title: "Elden Ring",
    image:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/library_600x900_2x.jpg",
    price: 2399,
    originalPrice: 3599,
    description:
      "Огромный фэнтезийный мир, сложные битвы и свобода исследования. Открой тайны Междуземья и выбери свой путь.",
    platform: "PS4 / PS5",
    russianVoice: true,
    russianSubtitles: true,
    rating: null,
    releaseDate: "25 February 2022",
    editions: [
      {
        id: "standard",
        name: "Standard Edition",
        price: 2399,
        originalPrice: 3599,
      },
      {
        id: "deluxe",
        name: "Deluxe Edition",
        price: 2899,
        originalPrice: 4199,
      },
    ],
    screenshots: [
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/ss_943bf6fe62352757d9070c1d33e50b92fe8539f1.600x338.jpg",
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/ss_dcdac9e4b26ac0ee5248bfd2967d764fd00cdb42.600x338.jpg",
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/ss_3c41384a24d86dddd58a8f61db77f9dc0bfda8b5.600x338.jpg",
    ],
  },
  {
    id: 3,
    title: "Hogwarts Legacy",
    image:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/990080/library_600x900_2x.jpg",
    price: 1999,
    originalPrice: 3499,
    description:
      "Открой Хогвартс XIX века, изучай магию, исследуй замок и стань частью своей собственной истории в волшебном мире.",
    platform: "PS5",
    russianVoice: true,
    russianSubtitles: true,
    rating: null,
    releaseDate: "10 February 2023",
    editions: [
      {
        id: "standard",
        name: "Standard Edition",
        price: 1999,
        originalPrice: 3499,
      },
      {
        id: "deluxe",
        name: "Deluxe Edition",
        price: 2599,
        originalPrice: 4299,
      },
    ],
    screenshots: [
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/990080/ss_725bf58485beb4aa37a3a69c1e2baa69bf3e4653.600x338.jpg",
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/990080/ss_df93b5e8a183f7232d68be94ae78920a90de1443.600x338.jpg",
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/990080/ss_94058497bf0f8fabdde17ee8d59bece609a60663.600x338.jpg",
    ],
  },
  {
    id: 4,
    title: "The Witcher 3: Wild Hunt",
    image:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/292030/library_600x900_2x.jpg",
    price: 749,
    originalPrice: 1499,
    description:
      "Классическая ролевая игра с огромным открытым миром, насыщенным сюжетом и незабываемыми приключениями Геральта.",
    platform: "PS4 / PS5",
    russianVoice: true,
    russianSubtitles: true,
    rating: null,
    releaseDate: "19 May 2015",
    editions: [
      {
        id: "standard",
        name: "Standard Edition",
        price: 749,
        originalPrice: 1499,
      },
      {
        id: "complete",
        name: "Complete Edition",
        price: 1099,
        originalPrice: 1999,
      },
    ],
    screenshots: [
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/292030/ss_5710298af2318afd9aa72449ef29ac4a2ef64d8e.600x338.jpg",
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/292030/ss_0901e64e9d4b8ebaea8348c194e7a3644d2d832d.600x338.jpg",
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/292030/ss_112b1e176c1bd271d8a565eacb6feaf90f240bb2.600x338.jpg",
    ],
  },
  {
    id: 5,
    title: "Red Dead Redemption 2",
    image:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1174180/library_600x900_2x.jpg",
    price: 1599,
    originalPrice: 3199,
    description:
      "Эпичное приключение на Диком Западе с сильным сюжетом, атмосферой и огромным живым миром.",
    platform: "PS4",
    russianVoice: false,
    russianSubtitles: false,
    rating: null,
    releaseDate: "26 October 2018",
    editions: [
      {
        id: "standard",
        name: "Standard Edition",
        price: 1599,
        originalPrice: 3199,
      },
      {
        id: "ultimate",
        name: "Ultimate Edition",
        price: 2299,
        originalPrice: 3999,
      },
    ],
    screenshots: [
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1174180/ss_66b553f4c209476d3e4ce25fa4714002cc914c4f.600x338.jpg",
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1174180/ss_bac60bacbf5da8945103648c08d27d5e202444ca.600x338.jpg",
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1174180/ss_668dafe477743f8b50b818d5bbfcec669e9ba93e.600x338.jpg",
    ],
  },
  {
    id: 6,
    title: "Resident Evil 4",
    image:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2050650/library_600x900_2x.jpg",
    price: 1899,
    originalPrice: 2999,
    description:
      "Переосмысление культового хоррора с современной графикой, динамичным экшеном и напряжённой атмосферой.",
    platform: "PS4 / PS5",
    russianVoice: true,
    russianSubtitles: true,
    rating: null,
    releaseDate: "24 March 2023",
    editions: [
      {
        id: "standard",
        name: "Standard Edition",
        price: 1899,
        originalPrice: 2999,
      },
      {
        id: "deluxe",
        name: "Deluxe Edition",
        price: 2399,
        originalPrice: 3499,
      },
    ],
    screenshots: [
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2050650/ss_59d1b19964cc532213df92c8287b75a0bffeb33c.600x338.jpg",
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2050650/ss_ab807f8ad9e968a620777caf483cb6020367b9ee.600x338.jpg",
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2050650/ss_0442f7fb4327d79802c2db8ea8d23d228a28d896.600x338.jpg",
    ],
  },
  {
    id: 7,
    title: "Baldur’s Gate 3",
    image:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1086940/library_600x900_2x.jpg",
    price: 2999,
    originalPrice: 3999,
    description:
      "Масштабная ролевая игра с невероятной свободой выбора, кооперативом и богатым фэнтезийным миром.",
    platform: "PS5",
    russianVoice: true,
    russianSubtitles: true,
    rating: null,
    releaseDate: "6 September 2023",
    editions: [
      {
        id: "standard",
        name: "Standard Edition",
        price: 2999,
        originalPrice: 3999,
      },
    ],
    screenshots: [
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/ss_c73bc54415178c07fef85f54ee26621728c77504.600x338.jpg",
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/ss_73d93bea842b93914d966622104dcb8c0f42972b.600x338.jpg",
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/ss_cf936d31061b58e98e0c646aee00e6030c410cda.600x338.jpg",
    ],
  },
  {
    id: 8,
    title: "Stray",
    image:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1332010/library_600x900_2x.jpg",
    price: 1299,
    originalPrice: 1999,
    description:
      "Необычное приключение глазами кота в атмосферном кибергороде с головоломками и исследованием.",
    platform: "PS4 / PS5",
    russianVoice: true,
    russianSubtitles: true,
    rating: null,
    releaseDate: "19 July 2022",
    editions: [
      {
        id: "standard",
        name: "Standard Edition",
        price: 1299,
        originalPrice: 1999,
      },
    ],
    screenshots: [
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1332010/ss_88e209a90c2039fa76bca6fa08c641365be38d50.600x338.jpg",
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1332010/ss_e8f0cbd5efdba352e89c4cfcee3fe991a1e1be8a.600x338.jpg",
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1332010/ss_2221af260c64362fdc835a9dca65f6f1d1192b25.600x338.jpg",
    ],
  },
];
