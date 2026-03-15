const mongoose = require('mongoose');

// Book Schema Definition
const bookSchema = new mongoose.Schema({
  cover_image_url: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String },
  date: { type: String, required: true },
  type: { type: String, default: 'book' },
  tags: [String],
  createdAt: { type: Date, default: Date.now }
});

const Book = mongoose.model('Book', bookSchema);

const seedBooks = [
  {
    cover_image_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop',
    title: '가장 약한 자에서 큰 용사로',
    subtitle: '기드온과 300 용사의 숨겨진 비밀',
    date: '2025년 12월호',
    type: 'magazine',
    tags: ['#창간', '#기드온', '#항아리']
  },
  {
    cover_image_url: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=600&auto=format&fit=crop',
    title: '그리스도인의 구별',
    subtitle: '세상과 소비를 대하는 거룩한 발걸음',
    date: '2026년 1월호',
    type: 'magazine',
    tags: ['#신년', '#결심', '#구별']
  },
  {
    cover_image_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop',
    title: '아버지의 마음',
    subtitle: '비로소 알게 된, 탕자를 향한 끝없는 사랑',
    date: '2026년 2월호',
    type: 'magazine',
    tags: ['#사랑', '#탕자', '#회복']
  },
  {
    cover_image_url: 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=600&auto=format&fit=crop',
    title: '솔로몬의 재판',
    subtitle: '가장 큰 지혜는 어디에서 오는가',
    date: '2026년 3월호',
    type: 'magazine',
    tags: ['#지혜', '#솔로몬', '#재판']
  }
];

mongoose.connect('mongodb://localhost:27017/monthly181').then(async () => {
    console.log('Connected to MongoDB. Starting seed...');
    
    // 이전 데이터 초기화
    await Book.deleteMany({});
    console.log('Cleared existing books.');

    // 새 데이터 삽입
    await Book.insertMany(seedBooks);
    console.log(`Successfully seeded ${seedBooks.length} books!`);
    
    mongoose.connection.close();
}).catch((err) => {
    console.error('Seed Error:', err);
    mongoose.connection.close();
});
