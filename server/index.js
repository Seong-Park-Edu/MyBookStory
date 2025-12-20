const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config(); // API 키 보호를 위해 사용

const app = express();
const PORT = 4000;

app.use(cors({
    origin: 'https://my-book-story.vercel.app/', // 1. 프론트엔드 도메인 허용
}));
app.use(express.json()); // JSON 데이터를 받기 위해 필수!


const MONGO_URI = process.env.MONGO_URI;
// 1. MongoDB 연결 (데이터베이스 이름: mybookstory)
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB 연결 성공!'))
    .catch(err => console.error('❌ DB 연결 에러:', err));

// 2. 독후감 데이터 구조(Schema) 정의
const reviewSchema = new mongoose.Schema({
    title: String,
    author: String,
    cover: String,
    content: String, // 에디터에서 작성한 HTML 내용
    date: { type: Date, default: Date.now }
});

const Review = mongoose.model('Review', reviewSchema);

// 3. 독후감 저장 API (POST)
app.post('/api/reviews', async (req, res) => {
    try {
        const newReview = new Review(req.body); // 프론트에서 보낸 데이터를 담음
        await newReview.save(); // DB에 실제 저장
        res.status(200).json({ message: '독후감이 안전하게 저장되었습니다!' });
    } catch (err) {
        res.status(500).json({ message: '저장 중 서버 오류가 발생했습니다.' });
    }
});

// 모든 독후감 목록 가져오기 API
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ date: -1 }); // 최신순으로 정렬
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "데이터를 불러오는 데 실패했습니다." });
  }
});
// --------------------------------------------------------------------------------


// 알라딘 API 키 (환경변수 설정 권장)
const TTB_KEY = process.env.TTB_KEY;

app.get('/api/search', async (req, res) => {
    try {
        const { query } = req.query;
        const response = await axios.get('http://www.aladin.co.kr/ttb/api/ItemSearch.aspx', {
            params: {
                ttbkey: TTB_KEY,
                Query: query,
                QueryType: 'Title',
                MaxResults: 12,
                SearchTarget: 'Book',
                output: 'js',
                Version: '20131101'
            }
        });
        // 알라딘 응답은 data.item에 배열로 들어옵니다.
        res.json(response.data.item || []);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "서버 에러가 발생했습니다." });
    }
});

app.listen(4000, () => console.log('Backend Server running on port 4000'));