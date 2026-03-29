export interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  readingTime: string;
  excerpt: string;
  content: string[];
  comments: Comment[];
  commentCount?: number;
}

export interface Comment {
  id: string;
  _id?: string;
  author: string;
  date: string;
  text: string;
  likes: number;
}

export interface TimelineEntry {
  id: string;
  _id?: string;
  date: string;
  text: string;
  type: "thought" | "linkedin" | "reflection";
  url?: string;
  likes: number;
  comments: number;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "the-silence-of-concrete-voids",
    title: "THE SILENCE OF CONCRETE VOIDS.",
    subtitle:
      "An inquiry into the emotional weight of monolithic structures and the absence of ornamentation.",
    date: "2024-11-12",
    readingTime: "12 min",
    excerpt:
      "The brutalist movement was never about the aggression of material, but the honesty of intent.",
    content: [
      "The brutalist movement was never about the aggression of material, but the honesty of intent. In this monograph, we explore how the raw application of concrete serves as a vacuum for human projection.",
      "When we strip away the secondary layers of architecture\u2014the paint, the trim, the decorative facade\u2014we are left with the skeleton of space. This skeletal reality demands a different kind of attention. It is not a design that invites you in; it is a design that forces you to exist within it.",
      "The rough grain of the timber-formed concrete tells a story of its own making, a permanent record of the labor that birthed it. Each imperfection is a timestamp, a geological record compressed into months rather than millennia.",
      "Silence is the primary acoustic property of high-mass structures. In the voids between the massive walls, sound is not just absorbed; it is neutralized. This environmental stillness creates a sensory deprivation that heightens the visual impact of the architecture itself.",
      "The intersection of light and mass defines the passage of time within these spaces. As the sun moves across the sky, the shadows cast by the overhanging eaves create a shifting geography of darkness. It is an architecture of transition, never static, always recalculating its own geometry relative to the light source.",
    ],
    comments: [
      { id: "1", author: "Marina K.", date: "2024-11-13", text: "This resonates deeply. The idea of architecture as sensory deprivation rather than stimulation is something I\u2019ve been thinking about in my own practice.", likes: 14 },
      { id: "2", author: "Thomas R.", date: "2024-11-14", text: "Beautiful writing. The line about concrete achieving the status of rock without geological time-scale is perfect.", likes: 8 },
      { id: "3", author: "Ava Chen", date: "2024-11-15", text: "I\u2019d love to see this expanded into a series. What are your thoughts on the Barbican as a case study?", likes: 5 },
    ],
    commentCount: 3,
  },
  {
    slug: "on-systems-thinking-and-the-design-of-everyday-friction",
    title: "ON SYSTEMS THINKING AND THE DESIGN OF EVERYDAY FRICTION.",
    subtitle: "Why the best systems are the ones you barely notice\u2014until they break.",
    date: "2024-10-28",
    readingTime: "8 min",
    excerpt:
      "We interact with hundreds of systems every day without a second thought.",
    content: [
      "We interact with hundreds of systems every day without a second thought. The light switch, the crosswalk signal, the way your browser remembers your tabs. These are designed silences\u2014invisible architectures of convenience.",
      "Good systems design is the art of removing friction while preserving meaning. It\u2019s the difference between a door that needs a \u2018push\u2019 sign and one whose form tells your body what to do.",
      "I\u2019ve been thinking about this in the context of product design. The best products I\u2019ve worked on are the ones where users never think about the interface. They just do the thing they came to do.",
      "But there\u2019s a tension: too little friction and you lose intentionality. The \u2018are you sure?\u2019 dialog exists for a reason. Undo is sacred. The best systems respect both the flow state and the moment of pause.",
    ],
    comments: [
      { id: "4", author: "James L.", date: "2024-10-29", text: "The door analogy is perfect. Don Norman would approve.", likes: 22 },
      { id: "5", author: "Priya S.", date: "2024-10-30", text: "This is why I love working with you. You think about the invisible things.", likes: 11 },
    ],
    commentCount: 2,
  },
  {
    slug: "the-weight-of-white-space",
    title: "THE WEIGHT OF WHITE SPACE.",
    subtitle: "Emptiness as a design decision, not a default.",
    date: "2024-09-15",
    readingTime: "6 min",
    excerpt:
      "White space is not the absence of design. It is design at its most deliberate.",
    content: [
      "White space is not the absence of design. It is design at its most deliberate\u2014the conscious decision to let content breathe, to give the eye a place to rest, to signal confidence.",
      "In typography, the space between letters matters as much as the letters themselves. Kerning is sculpture. Leading is architecture. The paragraph is a room, and white space is the air inside it.",
      "I\u2019ve noticed that the most confident brands use space lavishly. It\u2019s a luxury. It says: we don\u2019t need to fill every pixel to justify our existence. We trust our content.",
      "This site is built on that principle. Every element has room to exist. Nothing crowds. Nothing competes. The hierarchy speaks through proportion, not decoration.",
    ],
    comments: [
      { id: "6", author: "Elena V.", date: "2024-09-16", text: "This is exactly the design philosophy I aspire to. Less really is more when it\u2019s intentional.", likes: 18 },
    ],
    commentCount: 1,
  },
];

export const timelineEntries: TimelineEntry[] = [
  { id: "1", date: "2026-03-26", text: "Shipping something this week that I\u2019ve been thinking about for months. The gap between idea and execution is where most things die. Not this one.", type: "thought", likes: 42, comments: 7 },
  { id: "2", date: "2026-03-24", text: "The best design systems aren\u2019t the ones with the most components. They\u2019re the ones where every component earns its place. Pruning > adding.", type: "linkedin", likes: 187, comments: 23 },
  { id: "3", date: "2026-03-21", text: "Re-reading \u2018A Pattern Language\u2019 by Christopher Alexander. Every time I pick it up I find something new. Architecture as a generative grammar for human experience.", type: "reflection", likes: 31, comments: 4 },
  { id: "4", date: "2026-03-18", text: "Hot take: most \u2018minimal\u2019 designs aren\u2019t minimal\u2014they\u2019re just empty. True minimalism is the result of ruthless prioritization, not aesthetic laziness.", type: "linkedin", likes: 412, comments: 56 },
  { id: "5", date: "2026-03-14", text: "Spent the morning in a concrete parking garage thinking about light. The way it falls through the gaps between levels creates these perfect horizontal bands. Brutalism by accident.", type: "thought", likes: 28, comments: 3 },
  { id: "6", date: "2026-03-10", text: "The tools we choose shape the things we make. I\u2019ve been moving between Figma and code more fluidly lately, and it\u2019s changing how I think about both.", type: "linkedin", likes: 234, comments: 31 },
  { id: "7", date: "2026-03-07", text: "Every great product I\u2019ve seen starts with someone saying \u2018what if we just didn\u2019t do that?\u2019 Subtraction is the hardest design skill.", type: "thought", likes: 89, comments: 12 },
  { id: "8", date: "2026-03-03", text: "Coffee, silence, a blank page. Some days the work is just sitting with the problem. Not solving\u2014absorbing.", type: "reflection", likes: 56, comments: 8 },
  { id: "9", date: "2026-02-27", text: "Thinking about the difference between a platform and a product. A product solves a problem. A platform enables solutions. The shift is subtle but everything.", type: "linkedin", likes: 301, comments: 44 },
  { id: "10", date: "2026-02-22", text: "Typography is the voice of design. Choose a typeface like you\u2019d choose your words\u2014deliberately, with awareness of tone and context.", type: "thought", likes: 67, comments: 9 },
];
