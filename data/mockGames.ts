export type GameEdition = {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
};

export type Game = {
  id: number;
  title: string;
  image: string;
  price: number;
  originalPrice: number;
  description: string;
  platform: string;
  hasRussian: boolean;
  releaseDate: string;
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
    hasRussian: true,
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
      "https://cdn.akamai.steamstatic.com/steam/apps/1091500/ss_aeff8c6f7a86c96a8848ef5f697ddb586d555c34.jpg",
      "https://cdn.akamai.steamstatic.com/steam/apps/1091500/ss_0fbe07c511dc82fd0ef723c8d3ed6a1d2b19104f.jpg",
      "https://cdn.akamai.steamstatic.com/steam/apps/1091500/ss_d25f6a8b47f4f8ae09d0e87b84d888fffef67134.jpg",
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
    hasRussian: true,
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
      "https://cdn.akamai.steamstatic.com/steam/apps/1245620/ss_9475087ca7f84d5b4964f5aabdbed9a73b1af6df.jpg",
      "https://cdn.akamai.steamstatic.com/steam/apps/1245620/ss_b67b9a2d8d8f3d2f2775ac4f9f374ad7afb5f747.jpg",
      "https://cdn.akamai.steamstatic.com/steam/apps/1245620/ss_3485f6231c0e7e3d5e6efc66f534813df75f1a4f.jpg",
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
    hasRussian: true,
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
      "https://cdn.akamai.steamstatic.com/steam/apps/990080/ss_1be7b27a8f4fdf16fe8f2d304681140f64e56830.jpg",
      "https://cdn.akamai.steamstatic.com/steam/apps/990080/ss_7d343d6f2f401327582f5ea18284d888fffef671.jpg",
      "https://cdn.akamai.steamstatic.com/steam/apps/990080/ss_c8e64e3d8365dff78eaef65a269b4015f9e3cd50.jpg",
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
    hasRussian: true,
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
      "https://cdn.akamai.steamstatic.com/steam/apps/292030/ss_5f66f5e7f4ab79e927651c01fb9b31c7648206f2.jpg",
      "https://cdn.akamai.steamstatic.com/steam/apps/292030/ss_9ecdf41ecd6c3a58cbe1e3e0bbd10b191ed257a7.jpg",
      "https://cdn.akamai.steamstatic.com/steam/apps/292030/ss_d6b6ebf21876d3a7db0b3a7c33dcb162d723c50b.jpg",
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
    hasRussian: false,
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
      "https://cdn.akamai.steamstatic.com/steam/apps/1174180/ss_b7f6f8e99b3f7f59a7096cbab768c13213e63ed3.jpg",
      "https://cdn.akamai.steamstatic.com/steam/apps/1174180/ss_d1f4c2a3ccf7ecd6c6292a3a3aad0cb1b61bf3f1.jpg",
      "https://cdn.akamai.steamstatic.com/steam/apps/1174180/ss_6f6c4df9e5b0d66bd1d4fdfc9e4f38632766952f.jpg",
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
    hasRussian: true,
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
      "https://cdn.akamai.steamstatic.com/steam/apps/2050650/ss_0d7bcae4a3db7841e35cf1aaba3a0990353d363d.jpg",
      "https://cdn.akamai.steamstatic.com/steam/apps/2050650/ss_6d8f2bbf4e3ff1f146ddcaad419acf680cfb9fc5.jpg",
      "https://cdn.akamai.steamstatic.com/steam/apps/2050650/ss_e7acbff655648c0a5ddc8f7b65e9d6c7a94d6480.jpg",
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
    hasRussian: true,
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
      "https://cdn.akamai.steamstatic.com/steam/apps/1086940/ss_1f8f6f4f0eae5e7c6b7c9f1edbb0f44d8cb8d704.jpg",
      "https://cdn.akamai.steamstatic.com/steam/apps/1086940/ss_f7e4c4f8d27ac0bb4f9d87ed0d4830c87f3e9465.jpg",
      "https://cdn.akamai.steamstatic.com/steam/apps/1086940/ss_967c4e0f42f7f5d83c09c20d5ecb0ee944147f1d.jpg",
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
    hasRussian: true,
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
      "https://cdn.akamai.steamstatic.com/steam/apps/1332010/ss_5ea7da94d4f64e5c4d6fd0eabeb57e2de95397b6.jpg",
      "https://cdn.akamai.steamstatic.com/steam/apps/1332010/ss_ebad4fcb0c3a61f8ef874574f20e6f04e6ac849e.jpg",
      "https://cdn.akamai.steamstatic.com/steam/apps/1332010/ss_3194cdb188b4c04b14f0b0ec98c024aaa0dae68d.jpg",
    ],
  },
];
