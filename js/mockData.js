// mockData.js — Sample vocabulary extracted from subtitle files
// TODO: replace this entire array with real API call to subtitle parser + AI vocabulary extractor

const MOCK_WORDS = [
  {
    id: 1,
    word: "reluctant",
    partOfSpeech: "adjective",
    translation: "istamasdan, ikkilanuvchi",
    definition: "Unwilling and hesitant; not eager to do something.",
    ipa: "/rɪˈlʌktənt/",
    example: "She was reluctant to leave the party early.",
    level: "B1",
    learned: false
  },
  {
    id: 2,
    word: "inevitable",
    partOfSpeech: "adjective",
    translation: "muqarrar, oldini olib bo'lmaydigan",
    definition: "Certain to happen; unavoidable.",
    ipa: "/ɪnˈɛvɪtəbl/",
    example: "Change is inevitable in any growing organization.",
    level: "B2",
    learned: false
  },
  {
    id: 3,
    word: "pursue",
    partOfSpeech: "verb",
    translation: "intilmoq, ta'qib qilmoq",
    definition: "To follow or chase; to continue with a course of action or activity.",
    ipa: "/pəˈsjuː/",
    example: "He decided to pursue a career in medicine.",
    level: "B1",
    learned: false
  },
  {
    id: 4,
    word: "generous",
    partOfSpeech: "adjective",
    translation: "saxiy, ochiq qo'l",
    definition: "Showing a readiness to give more than is strictly necessary.",
    ipa: "/ˈdʒɛnərəs/",
    example: "It was generous of her to share her lunch.",
    level: "A2",
    learned: false
  },
  {
    id: 5,
    word: "consequence",
    partOfSpeech: "noun",
    translation: "oqibat, natija",
    definition: "A result or effect of an action or condition.",
    ipa: "/ˈkɒnsɪkwəns/",
    example: "He failed to consider the consequences of his actions.",
    level: "B1",
    learned: false
  },
  {
    id: 6,
    word: "ambiguous",
    partOfSpeech: "adjective",
    translation: "noaniq, ikki ma'noli",
    definition: "Open to more than one interpretation; not having one obvious meaning.",
    ipa: "/æmˈbɪɡjuəs/",
    example: "The instructions were ambiguous and confusing.",
    level: "B2",
    learned: false
  },
  {
    id: 7,
    word: "diligent",
    partOfSpeech: "adjective",
    translation: "mehnatsevar, tirishqoq",
    definition: "Having or showing care and conscientiousness in one's work or duties.",
    ipa: "/ˈdɪlɪdʒənt/",
    example: "She was a diligent student who always completed her assignments.",
    level: "B1",
    learned: false
  },
  {
    id: 8,
    word: "negotiate",
    partOfSpeech: "verb",
    translation: "muzokaralar olib bormoq, kelishmoq",
    definition: "To try to reach an agreement through discussion.",
    ipa: "/nɪˈɡəʊʃɪeɪt/",
    example: "They had to negotiate the terms of the contract.",
    level: "B2",
    learned: false
  },
  {
    id: 9,
    word: "apparent",
    partOfSpeech: "adjective",
    translation: "aniq, ravshan, ko'rinadigan",
    definition: "Clearly visible or understood; obvious.",
    ipa: "/əˈpærənt/",
    example: "It was apparent that she was upset about something.",
    level: "B1",
    learned: false
  },
  {
    id: 10,
    word: "acquire",
    partOfSpeech: "verb",
    translation: "orttirmoq, qo'lga kiritmoq",
    definition: "To buy or obtain something; to learn or develop a skill or habit.",
    ipa: "/əˈkwaɪər/",
    example: "It takes years to acquire fluency in a foreign language.",
    level: "B1",
    learned: false
  },
  {
    id: 11,
    word: "privilege",
    partOfSpeech: "noun",
    translation: "imtiyoz, maxsus huquq",
    definition: "A special right or advantage available only to a particular person or group.",
    ipa: "/ˈprɪvɪlɪdʒ/",
    example: "Education is a privilege that not everyone has access to.",
    level: "B2",
    learned: false
  },
  {
    id: 12,
    word: "curious",
    partOfSpeech: "adjective",
    translation: "qiziquvchan, bilishga chanqoq",
    definition: "Eager to know or learn something.",
    ipa: "/ˈkjʊərɪəs/",
    example: "The curious child asked endless questions.",
    level: "A2",
    learned: false
  },
  {
    id: 13,
    word: "exhausted",
    partOfSpeech: "adjective",
    translation: "charchagan, holdan toygan",
    definition: "Drained of one's physical or mental resources; very tired.",
    ipa: "/ɪɡˈzɔːstɪd/",
    example: "After the marathon, she was completely exhausted.",
    level: "A2",
    learned: false
  },
  {
    id: 14,
    word: "persuade",
    partOfSpeech: "verb",
    translation: "ishontirmoq, ko'ndirmoq",
    definition: "To cause someone to do something through reasoning or argument.",
    ipa: "/pəˈsweɪd/",
    example: "He managed to persuade his parents to let him go.",
    level: "B1",
    learned: false
  },
  {
    id: 15,
    word: "elaborate",
    partOfSpeech: "adjective / verb",
    translation: "murakkab; batafsil tushuntirmoq",
    definition: "Involving many carefully arranged parts; to explain in more detail.",
    ipa: "/ɪˈlæbərət/",
    example: "She gave an elaborate explanation of the theory.",
    level: "B2",
    learned: false
  }
];

// IDs of words the user has selected to study
// TODO: replace with session data returned from backend
let selectedWordIds = MOCK_WORDS.map(w => w.id);

function getSelectedWords() {
  return MOCK_WORDS.filter(w => selectedWordIds.includes(w.id));
}

function toggleWordSelection(id) {
  if (selectedWordIds.includes(id)) {
    selectedWordIds = selectedWordIds.filter(x => x !== id);
  } else {
    selectedWordIds.push(id);
  }
  saveSelectionToStorage();
}

function saveSelectionToStorage() {
  localStorage.setItem('sublingo_selected', JSON.stringify(selectedWordIds));
}

function loadSelectionFromStorage() {
  const stored = localStorage.getItem('sublingo_selected');
  if (stored) {
    selectedWordIds = JSON.parse(stored);
  }
}

loadSelectionFromStorage();
