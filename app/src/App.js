import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { supabase } from './supabaseClient'
import Auth from './Auth'
import Chat from './Chat'

function App() {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [content, setContent] = useState('');
  const [myReviews, setMyReviews] = useState([]);
  const [viewingReview, setViewingReview] = useState(null);
  const [session, setSession] = useState(null);
  const API_URL = "https://mybookstory.onrender.com";

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => { if (subscription) subscription.unsubscribe(); };
  }, []);

  const fetchReviews = async () => {
    try {
      // Supabase의 'reviews' 테이블에서 모든 데이터를 가져옴
      // 만약 내가 쓴 글만 보고 싶다면 .eq('user_id', session.user.id) 를 추가하세요.
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false }); // 최신순 정렬

      if (error) throw error;
      setMyReviews(data || []);
    } catch (err) {
      console.error("목록 로딩 실패:", err.message);
    }
  };

  useEffect(() => { fetchReviews(); }, []);

  const handleSearch = async () => {
    if (!query) return;
    try {
      const res = await axios.get(`${API_URL}/api/search?query=${query}`);
      setBooks(res.data);
      setSelectedBook(null);
    } catch (err) { alert("서버 연결을 확인해주세요."); }
  };

  const saveReview = async () => {
    if (!selectedBook) return;

    const reviewData = {
      title: selectedBook.title,
      author: selectedBook.author,
      cover: selectedBook.cover,
      content: content,
      user_id: session.user.id // 👈 중요: RLS 정책을 통과하기 위해 필수!
    };

    try {
      const { error } = await supabase
        .from('reviews')
        .insert([reviewData]);

      if (error) throw error;

      alert("성공적으로 저장되었습니다! 🎉");
      fetchReviews(); // 저장 후 목록 갱신

      // 입력창 초기화
      setSelectedBook(null);
      setContent('');
      setQuery('');
      setBooks([]);
    } catch (err) {
      console.error("저장 실패:", err.message);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  if (!session) return <Auth />;

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8f9fa', fontFamily: 'sans-serif' }}>

      {/* --- 왼쪽 사이드바: 내 서재 & 채팅 --- */}
      <div style={{ width: '350px', backgroundColor: '#fff', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>📖 MyBookStory</h2>
          <small style={{ color: '#888' }}>{session.user.email.split('@')[0]}님 환영합니다</small>
          <button onClick={() => supabase.auth.signOut()} style={{ display: 'block', marginTop: '10px', fontSize: '11px' }}>로그아웃</button>
        </div>

        {/* 내 서재 미니 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
          <h4 style={{ marginBottom: '10px' }}>📚 나의 서재 ({myReviews.length})</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {myReviews.map((rev) => (
              <div key={rev._id} onClick={() => setViewingReview(rev)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                <img src={rev.cover} alt="cover" style={{ width: '100%', borderRadius: '4px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }} />
                <div style={{ fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rev.title}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 채팅창을 사이드바 하단에 고정 */}
        <div style={{ height: '350px', borderTop: '2px solid #eee' }}>
          <Chat session={session} />
        </div>
      </div>

      {/* --- 오른쪽 메인 섹션: 검색 & 에디터 --- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '30px', overflowY: 'auto' }}>

        {/* 상단 검색바 */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="어떤 책의 독후감을 쓰실 건가요?"
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' }}
          />
          <button onClick={handleSearch} style={{ padding: '10px 25px', borderRadius: '8px', backgroundColor: '#333', color: '#fff', cursor: 'pointer' }}>검색</button>
        </div>

        <div style={{ display: 'flex', gap: '30px', flex: 1 }}>
          {/* 검색 결과 레이어 */}
          <div style={{ width: '250px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px', padding: '10px', backgroundColor: '#fff' }}>
            {books.length > 0 ? books.map((book) => (
              <div key={book.isbn13} onClick={() => setSelectedBook(book)} style={{ padding: '10px', borderBottom: '1px solid #f9f9f9', cursor: 'pointer', display: 'flex', gap: '10px' }}>
                <img src={book.cover} style={{ width: '40px', height: '60px' }} />
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{book.title}</div>
              </div>
            )) : <div style={{ color: '#ccc', textAlign: 'center', marginTop: '50px' }}>검색 결과가 없습니다.</div>}
          </div>

          {/* 에디터 영역 */}
          <div style={{ flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee', position: 'relative' }}>
            {selectedBook ? (
              <>
                <h3>『{selectedBook.title}』 독후감 작성</h3>
                <ReactQuill theme="snow" value={content} onChange={setContent} style={{ height: 'calc(100% - 150px)', marginBottom: '50px' }} />
                <button onClick={saveReview} style={{ position: 'absolute', bottom: '20px', right: '20px', padding: '15px 40px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>저장하기</button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>
                왼쪽에서 책을 검색하고 선택해 주세요.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 모달 상세보기 (유지) */}
      {viewingReview && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '15px', width: '60%', maxHeight: '80vh', overflowY: 'auto' }}>
            <button onClick={() => setViewingReview(null)} style={{ float: 'right' }}>닫기</button>
            <h2>{viewingReview.title}</h2>
            <hr />
            <div dangerouslySetInnerHTML={{ __html: viewingReview.content }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;