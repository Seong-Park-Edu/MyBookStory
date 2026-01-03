import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import Chat from './Chat';

function App() {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [content, setContent] = useState('');
  const [myReviews, setMyReviews] = useState([]);
  const [viewingReview, setViewingReview] = useState(null);
  const [session, setSession] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // 수정 모드인지 확인
  const [editContent, setEditContent] = useState(''); // 수정 중인 내용

  // 모달 제어 상태
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listSearchQuery, setListSearchQuery] = useState('');

  // 1. 세션 관리 및 인증 상태 감지
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

  // 2. Supabase에서 독후감 목록 가져오기
  const fetchReviews = async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMyReviews(data || []);
    } catch (err) {
      console.error("목록 로딩 실패:", err.message);
    }
  };

  useEffect(() => {
    if (session) fetchReviews();
  }, [session]);

  // 3. 도서 검색 (Aladin API 대행 서버 호출 - 기존 로직 유지)
  const handleSearch = async () => {
    if (!query) return;
    try {
      // 기존에 쓰시던 Render 서버 주소를 유지하거나 필요시 수정하세요.
      const res = await fetch(`https://mybookstory.onrender.com/api/search?query=${query}`);
      const data = await res.json();
      setBooks(data);
      setSelectedBook(null);
    } catch (err) {
      alert("도서 검색 중 오류가 발생했습니다.");
    }
  };

  // 4. Supabase에 독후감 저장
  const saveReview = async () => {
    if (!selectedBook || !session) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .insert([{
          title: selectedBook.title,
          author: selectedBook.author,
          cover: selectedBook.cover,
          content: content,
          user_id: session.user.id // RLS 통과를 위해 필수
        }]);

      if (error) throw error;

      alert("성공적으로 저장되었습니다! 🎉");
      fetchReviews();
      setSelectedBook(null);
      setContent('');
      setQuery('');
      setBooks([]);
    } catch (err) {
      alert("저장 실패: " + err.message);
    }
  };

  // 독후감 삭제 함수
  const deleteReview = async (id) => {
    if (!window.confirm("정말로 이 독후감을 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw error;

      alert("삭제되었습니다.");
      setViewingReview(null); // 모달 닫기
      fetchReviews(); // 목록 새로고침
    } catch (err) {
      alert("삭제 실패: " + err.message);
    }
  };

  // 독후감 수정 저장 함수
  const updateReview = async (id) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ content: editContent })
        .eq('id', id);

      if (error) throw error;

      alert("수정되었습니다.");
      setIsEditing(false);
      // 상세 보기 데이터 업데이트를 위해 현재 보고 있는 리뷰 상태도 갱신
      setViewingReview({ ...viewingReview, content: editContent });
      fetchReviews(); // 목록 새로고침
    } catch (err) {
      alert("수정 실패: " + err.message);
    }
  };

  // 서재 내 검색 필터링
  const filteredReviews = myReviews.filter(rev =>
    rev.title.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
    rev.author.toLowerCase().includes(listSearchQuery.toLowerCase())
  );

  if (!session) return <Auth />;

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f0f2f5', overflow: 'hidden', fontFamily: 'sans-serif' }}>

      {/* --- [왼쪽 섹션: 실시간 채팅] --- */}
      <div style={{ width: '380px', borderRight: '1px solid #ddd', backgroundColor: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>MyBookStory</h2>
            <small style={{ color: '#888' }}>{session.user.email.split('@')[0]}님</small>
          </div>
          <button onClick={() => supabase.auth.signOut()} style={{ fontSize: '11px', padding: '5px' }}>로그아웃</button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Chat session={session} />
        </div>
      </div>

      {/* --- [오른쪽 섹션: 메인 작업 영역] --- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* 네비게이션 바 */}
        <div style={{ height: '65px', backgroundColor: '#fff', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 30px' }}>
          <button
            onClick={() => setIsListModalOpen(true)}
            style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '25px', border: '2px solid #333', backgroundColor: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            📚 내 서재 목록 ({myReviews.length})
          </button>
        </div>

        {/* 에디터 메인 */}
        <div style={{ flex: 1, padding: '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* 검색창 */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="독후감을 작성할 책을 검색해 보세요..."
              style={{ flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid #ccc', fontSize: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
            />
            <button onClick={handleSearch} style={{ padding: '0 30px', backgroundColor: '#333', color: '#fff', borderRadius: '12px', cursor: 'pointer', border: 'none', fontSize: '16px' }}>검색</button>
          </div>

          <div style={{ display: 'flex', gap: '25px', flex: 1 }}>
            {/* 검색 결과 가로형 리스트 (책 선택 시 에디터에 집중하기 위해 좁게 배치) */}
            <div style={{ width: '280px', backgroundColor: '#fff', borderRadius: '15px', border: '1px solid #eee', overflowY: 'auto', padding: '15px' }}>
              <h4 style={{ marginTop: 0, color: '#666' }}>검색 결과</h4>
              {books.map((book) => (
                <div key={book.isbn13} onClick={() => setSelectedBook(book)} style={{ padding: '12px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', display: 'flex', gap: '12px', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <img src={book.cover} style={{ width: '45px', height: '65px', borderRadius: '4px' }} alt="c" />
                  <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                    <div style={{ fontWeight: 'bold' }}>{book.title}</div>
                    <div style={{ color: '#888', fontSize: '11px' }}>{book.author}</div>
                  </div>
                </div>
              ))}
              {books.length === 0 && <div style={{ textAlign: 'center', color: '#ccc', paddingTop: '50px' }}>검색 결과가 없습니다.</div>}
            </div>

            {/* 실제 글쓰기 공간 */}
            <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '15px', border: '1px solid #eee', padding: '25px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {selectedBook ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                    <img src={selectedBook.cover} style={{ width: '50px', borderRadius: '4px' }} alt="s" />
                    <h3 style={{ margin: 0 }}>『{selectedBook.title}』 기록하기</h3>
                  </div>
                  <div style={{ flex: 1, marginBottom: '60px' }}>
                    <ReactQuill theme="snow" value={content} onChange={setContent} style={{ height: '100%' }} />
                  </div>
                  <button onClick={saveReview} style={{ position: 'absolute', bottom: '25px', right: '25px', padding: '15px 45px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>저장하기</button>
                </>
              ) : (
                <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#bbb', textAlign: 'center' }}>
                  <p>위 검색창에서 책을 찾고<br />왼쪽 결과에서 책을 선택해 주세요.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- [내 서재 목록 대형 모달] --- */}
      {isListModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', z_index: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: '85%', height: '85%', backgroundColor: '#fff', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '25px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                <h2 style={{ margin: 0 }}>📚 나의 서재</h2>
                <input
                  placeholder="제목이나 저자로 내 글 찾기..."
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  style={{ width: '350px', padding: '12px 20px', borderRadius: '25px', border: '1px solid #ddd', fontSize: '14px' }}
                />
              </div>
              <button onClick={() => setIsListModalOpen(false)} style={{ border: 'none', background: '#eee', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>닫기</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '30px' }}>
              {filteredReviews.map((rev) => (
                <div key={rev.id} onClick={() => { setViewingReview(rev); setIsListModalOpen(false); }} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <img src={rev.cover} style={{ width: '100%', borderRadius: '10px', boxShadow: '0 8px 15px rgba(0,0,0,0.1)' }} alt="c" />
                  <div style={{ marginTop: '12px', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rev.title}</div>
                  <small style={{ color: '#999' }}>{new Date(rev.created_at).toLocaleDateString()}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- [상세보기 모달] --- */}
      {viewingReview && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#fff', width: '700px', maxHeight: '85vh', borderRadius: '20px', padding: '40px', overflowY: 'auto', position: 'relative' }}>

            {/* 닫기 버튼 */}
            <button onClick={() => { setViewingReview(null); setIsEditing(false); }} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>

            <div style={{ display: 'flex', gap: '25px', marginBottom: '30px' }}>
              <img src={viewingReview.cover} style={{ width: '120px', borderRadius: '8px' }} alt="v" />
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 10px 0' }}>{viewingReview.title}</h2>
                <p style={{ color: '#666', margin: '0 0 10px 0' }}>{viewingReview.author}</p>

                {/* 수정/삭제 버튼들 */}
                {!isEditing && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setIsEditing(true); setEditContent(viewingReview.content); }} style={{ padding: '5px 15px', borderRadius: '5px', border: '1px solid #007bff', color: '#007bff', backgroundColor: '#fff', cursor: 'pointer' }}>수정</button>
                    <button onClick={() => deleteReview(viewingReview.id)} style={{ padding: '5px 15px', borderRadius: '5px', border: '1px solid #dc3545', color: '#dc3545', backgroundColor: '#fff', cursor: 'pointer' }}>삭제</button>
                  </div>
                )}
              </div>
            </div>

            <hr style={{ border: '0.5px solid #eee', marginBottom: '30px' }} />

            {isEditing ? (
              <div style={{ height: '300px', marginBottom: '60px' }}>
                <ReactQuill theme="snow" value={editContent} onChange={setEditContent} style={{ height: '100%' }} />
                <div style={{ display: 'flex', gap: '10px', marginTop: '50px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setIsEditing(false)} style={{ padding: '10px 20px', borderRadius: '5px', border: '1px solid #ccc', cursor: 'pointer' }}>취소</button>
                  <button onClick={() => updateReview(viewingReview.id)} style={{ padding: '10px 20px', borderRadius: '5px', border: 'none', backgroundColor: '#007bff', color: '#fff', cursor: 'pointer' }}>수정 완료</button>
                </div>
              </div>
            ) : (
              <div className="ql-editor" dangerouslySetInnerHTML={{ __html: viewingReview.content }} style={{ lineHeight: '1.8', fontSize: '16px' }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;