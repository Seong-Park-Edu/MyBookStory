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
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>📖 MyBookStory</h1>

      {/* 1. 검색 섹션 */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="책 제목을 검색하세요"
          style={{ padding: '12px', width: '70%', borderRadius: '5px 0 0 5px', border: '1px solid #ccc', fontSize: '16px' }}
        />
        <button
          onClick={handleSearch}
          style={{ padding: '12px 20px', borderRadius: '0 5px 5px 0', border: 'none', background: '#007bff', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
        >
          검색
        </button>
      </div>

      {/* 2. 메인 콘텐츠 (작성 영역) */}
      <div style={{ marginBottom: '50px' }}>
        {selectedBook ? (
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px', border: '1px solid #eee' }}>
            <h3 style={{ marginBottom: '15px' }}>『{selectedBook.title}』 기록하기</h3>
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              style={{ height: '250px', marginBottom: '50px', backgroundColor: '#fff' }}
            />
            <button
              style={{ width: '100%', padding: '15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
              onClick={saveReview}>
              내 서재에 저장
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#999', border: '2px dashed #eee', padding: '30px', borderRadius: '10px' }}>
            상단에서 책을 검색하고 선택하면 독후감을 쓸 수 있습니다.
          </div>
        )}
      </div>

      {/* 3. 나의 서재 섹션 */}
      <div style={{ marginTop: '50px', borderTop: '2px solid #333', paddingTop: '30px' }}>
        <h2 style={{ marginBottom: '20px' }}>📚 나의 서재 (총 {myReviews.length}권)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '20px' }}>
          {myReviews.map((rev) => (
            <div
              key={rev._id}
              onClick={() => setViewingReview(rev)}
              style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <img src={rev.cover} alt="cover" style={{ width: '100%', height: '170px', objectFit: 'cover', borderRadius: '5px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }} />
              <h4 style={{ fontSize: '13px', margin: '10px 0 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rev.title}</h4>
            </div>
          ))}
        </div>
      </div>

      {/* 4. 상세보기 및 수정 모달 */}
      {viewingReview && (
        <>
          {/* 배경 어둡게 */}
          <div
            onClick={() => setViewingReview(null)}
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000 }}
          />

          {/* 모달 창 */}
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff', padding: '20px', borderRadius: '15px', zIndex: 1001,
            width: '90%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>『{viewingReview.title}』</h3>
              <button onClick={() => setViewingReview(null)} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ flex: 1 }}>
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                style={{ height: '200px', marginBottom: '45px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => updateReview(viewingReview._id, content)}
                style={{ flex: 1, padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                수정 완료
              </button>
              <button
                onClick={() => deleteReview(viewingReview._id)}
                style={{ flex: 1, padding: '12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                삭제하기
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;