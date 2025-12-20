import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill-new'; // react-quill 대신 react-quill-new 사용
import 'react-quill-new/dist/quill.snow.css'; // css 경로도 new로 변경

function App() {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [content, setContent] = useState('');
  const [myReviews, setMyReviews] = useState([]); // 내 독후감 목록 상태
  const [viewingReview, setViewingReview] = useState(null); // 상세보기용 상태

  // 서버에서 독후감 목록을 가져오는 함수
  const fetchReviews = async () => {
    try {
      const res = await axios.get('http://localhost:4000/api/reviews');
      setMyReviews(res.data);
    } catch (err) {
      console.error("목록 로딩 실패:", err);
    }
  };

  // 앱이 처음 실행될 때 자동으로 목록을 한 번 불러옵니다.
  useEffect(() => {
    fetchReviews();
  }, []);

  // 도서 검색 (백엔드 서버:4000 포트 호출)
  const handleSearch = async () => {
    if (!query) return;
    try {
      const res = await axios.get(`http://localhost:4000/api/search?query=${query}`);
      setBooks(res.data);
      setSelectedBook(null);
    } catch (err) {
      console.error("검색 중 오류:", err);
      alert("서버가 켜져 있는지 확인해 주세요!");
    }
  };

  // 독후감 저장
  const saveReview = async () => {
    // 서버로 보낼 묶음 (JSON)
    const reviewData = {
      title: selectedBook.title,
      author: selectedBook.author,
      cover: selectedBook.cover,
      content: content // 에디터의 HTML 내용
    };

    try {
      // axios를 사용해 서버의 POST API 호출
      const res = await axios.post('http://localhost:4000/api/reviews', reviewData);

      alert(res.data.message); // "성공적으로 저장되었습니다!"

      fetchReviews(); // 👈 저장 후 목록 다시 불러오기 추가!

      // 저장 후 초기화
      setSelectedBook(null);
      setContent('');
      setQuery('');
      setBooks([]);
    } catch (err) {
      console.error("저장 실패:", err);
      alert("서버 통신 오류로 저장하지 못했습니다.");
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h1>📖 MyBookStory</h1>

      {/* 검색 섹션 */}
      <div style={{ marginBottom: '20px' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="책 제목을 검색하세요"
          style={{ padding: '10px', width: '300px' }}
        />
        <button onClick={handleSearch} style={{ padding: '10px 20px', marginLeft: '10px' }}>검색</button>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* 검색 결과 목록 */}
        <div style={{ flex: 1, maxHeight: '80vh', overflowY: 'auto' }}>
          {books.map((book) => (
            <div key={book.isbn13}
              style={{ border: '1px solid #ddd', padding: '10px', marginBottom: '10px', cursor: 'pointer', borderRadius: '5px' }}
              onClick={() => setSelectedBook(book)}>
              <img src={book.cover} alt="cover" style={{ width: '50px', float: 'left', marginRight: '10px' }} />
              <div style={{ fontWeight: 'bold' }}>{book.title}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{book.author}</div>
              <div style={{ clear: 'both' }}></div>
            </div>
          ))}
        </div>

        {/* 독후감 작성 에디터 */}
        <div style={{ flex: 2 }}>
          {selectedBook ? (
            <div>
              <h3>『{selectedBook.title}』 독후감 작성</h3>
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                style={{ height: '400px', marginBottom: '50px' }}
              />
              <button
                style={{ width: '100%', padding: '15px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                onClick={saveReview}>
                저장하기
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#ccc', marginTop: '100px' }}>
              왼쪽에서 책을 선택하면 독후감을 쓸 수 있습니다.
            </div>
          )}
        </div>

        <div style={{ marginTop: '50px', borderTop: '2px solid #333', paddingTop: '20px' }}>
          <h2>📚 나의 서재 (총 {myReviews.length}권)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
            {myReviews.map((rev) => (
              <div
                key={rev._id}
                onClick={() => setViewingReview(rev)} // 클릭하면 상세보기 설정
                style={{ textAlign: 'center', border: '1px solid #eee', padding: '10px' }}
              >
                <img src={rev.cover} alt="cover" style={{ width: '100px', height: '140px', objectFit: 'cover' }} />
                <h4 style={{ fontSize: '14px', margin: '10px 0 5px' }}>{rev.title}</h4>
                <p style={{ fontSize: '12px', color: '#888' }}>{new Date(rev.date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 독후감 상세보기 모달 */}
        {/* 상세 보기 창 (viewingReview가 있을 때만 뜸) */}
        {viewingReview && (
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: '#fff', padding: '30px', border: '1px solid #333', borderRadius: '10px',
            zIndex: 1000, width: '80%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 0 15px rgba(0,0,0,0.5)'
          }}>
            <button onClick={() => setViewingReview(null)} style={{ float: 'right' }}>닫기</button>
            <h2>{viewingReview.title}</h2>
            <p style={{ color: '#666' }}>{viewingReview.author}</p>
            <hr />
            {/* Quill 에디터로 쓴 HTML 내용을 그대로 보여줄 때 사용하는 특수 속성 */}
            <div dangerouslySetInnerHTML={{ __html: viewingReview.content }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;