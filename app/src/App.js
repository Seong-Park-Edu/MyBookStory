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
  const API_URL = "https://mybookstory.onrender.com";

  // 앱이 처음 실행될 때 자동으로 목록을 한 번 불러옵니다.
  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
  if (viewingReview) {
    // 서재에서 책을 클릭하면, 그 책의 내용을 에디터 상태에 복사해줍니다.
    setContent(viewingReview.content);
  } else {
    // 팝업을 닫으면 에디터 내용을 비워줍니다 (선택 사항)
    setContent('');
  }
}, [viewingReview]); // viewingReview가 바뀔 때마다 실행!

  // 서버에서 독후감 목록을 가져오는 함수
  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/reviews`);
      setMyReviews(res.data);
    } catch (err) {
      console.error("목록 로딩 실패:", err);
    }
  };

  // 도서 검색 (백엔드 서버:4000 포트 호출)
  const handleSearch = async () => {
    if (!query) return;
    try {
      const res = await axios.get(`${API_URL}/api/search?query=${query}`);
      setBooks(res.data);
      setSelectedBook(null);
    } catch (err) {
      console.error("검색 중 오류:", err);
      alert("서버가 켜져 있는지 확인해 주세요!");
      alert(`서버 주소: ${API_URL}\n에러 메시지: ${err.message}`);
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
      const res = await axios.post(`${API_URL}/api/reviews`, reviewData);

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

  // 독후감 삭제
  const deleteReview = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`${API_URL}/api/reviews/${id}`);
      alert("삭제되었습니다.");
      setViewingReview(null); // 팝업 닫기
      fetchReviews(); // 목록 새로고침
    } catch (err) {
      alert("삭제 실패");
    }
  };

  //독후감 수정
  // 상세 보기 팝업 안에 추가할 '수정 완료' 함수
  const updateReview = async (id, newContent) => {
    try {
      await axios.put(`${API_URL}/api/reviews/${id}`, { content: newContent });
      alert("수정되었습니다.");
      fetchReviews(); // 목록 새로고침
    } catch (err) {
      alert("수정 실패");
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

      <div style={{
        display: 'flex',
        flexDirection: window.innerWidth < 768 ? 'column' : 'row', // 768px 미만(모바일)이면 세로로!
        gap: '20px'
      }}>
        {/* 검색 결과 목록 (모바일에서는 높이를 조절해주는 게 좋아요) */}
        <div style={{
          flex: 1,
          maxHeight: window.innerWidth < 768 ? '300px' : '80vh',
          overflowY: 'auto',
          border: '1px solid #eee',
          padding: '10px'
        }}>
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
          <div style={{ /* 기존 스타일 유지 */ }}>
            <button onClick={() => setViewingReview(null)} style={{ float: 'right' }}>닫기</button>
            <h2>{viewingReview.title}</h2>

            {/* 수정 가능한 에디터 (상세보기창에서 바로 수정 가능하게 함) */}
            <div style={{ marginTop: '20px' }}>
              <ReactQuill
                theme="snow"
                defaultValue={viewingReview.content}
                onChange={(val) => setContent(val)} // 임시로 content 상태 사용
                style={{ height: '300px', marginBottom: '50px' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => updateReview(viewingReview._id, content)}
                  style={{ flex: 1, padding: '10px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px' }}
                >
                  수정 완료
                </button>
                <button
                  onClick={() => deleteReview(viewingReview._id)}
                  style={{ flex: 1, padding: '10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '5px' }}
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;