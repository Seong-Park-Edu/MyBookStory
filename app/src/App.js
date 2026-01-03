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

  // 모달 및 필터 상태
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('private'); // 'private' 또는 'public'
  const [isPublic, setIsPublic] = useState(false); // 저장 시 공개 여부

  // 수정 기능 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

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

  // 1. 독후감 불러오기 (RLS 정책에 따라 공개글+내글이 알아서 필터링됨)
  const fetchReviews = async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMyReviews(data || []);
    } catch (err) { console.error(err.message); }
  };

  useEffect(() => { if (session) fetchReviews(); }, [session]);

  const handleSearch = async () => {
    if (!query) return;
    try {
      const res = await fetch(`https://mybookstory.onrender.com/api/search?query=${query}`);
      const data = await res.json();
      setBooks(data);
    } catch (err) { alert("검색 오류"); }
  };

  // 2. 독후감 저장 (공개 여부 포함)
  const saveReview = async () => {
    if (!selectedBook || !session) return;
    try {
      const { error } = await supabase.from('reviews').insert([{
        title: selectedBook.title,
        author: selectedBook.author,
        cover: selectedBook.cover,
        content: content,
        user_id: session.user.id,
        is_public: isPublic // 컬럼 추가 필수!
      }]);
      if (error) throw error;
      alert("저장되었습니다!");
      fetchReviews();
      setSelectedBook(null); setContent(''); setIsPublic(false);
    } catch (err) { alert(err.message); }
  };

  // 3. 수정 및 삭제 로직
  const deleteReview = async (id) => {
    if (!window.confirm("삭제하시겠습니까?")) return;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (!error) { alert("삭제됨"); setViewingReview(null); fetchReviews(); }
  };

  const updateReview = async (id) => {
    const { error } = await supabase.from('reviews').update({ content: editContent }).eq('id', id);
    if (!error) { 
      alert("수정됨"); 
      setIsEditing(false); 
      setViewingReview({ ...viewingReview, content: editContent });
      fetchReviews(); 
    }
  };

  // 서재 필터링 로직
  const filteredReviews = myReviews.filter(rev => {
    const matchesSearch = rev.title.toLowerCase().includes(listSearchQuery.toLowerCase());
    if (viewMode === 'private') return rev.user_id === session?.user.id && matchesSearch;
    return rev.is_public && matchesSearch;
  });

  if (!session) return <Auth />;

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f0f2f5', overflow: 'hidden' }}>
      
      {/* 왼쪽: 채팅 */}
      <div style={{ width: '380px', borderRight: '1px solid #ddd', backgroundColor: '#fff', display: 'flex', flexDirection: 'column' }}>
        <Chat session={session} />
      </div>

      {/* 오른쪽: 메인 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: '65px', backgroundColor: '#fff', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 30px' }}>
          <button onClick={() => setIsListModalOpen(true)} style={{ padding: '10px 20px', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold' }}>
            📚 서재 탐색하기 ({myReviews.length})
          </button>
        </div>

        <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="책 검색..." style={{ flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid #ccc' }} />
            <button onClick={handleSearch} style={{ padding: '0 30px', backgroundColor: '#333', color: '#fff', borderRadius: '12px', cursor: 'pointer' }}>검색</button>
          </div>

          <div style={{ display: 'flex', gap: '25px', height: '80%' }}>
            <div style={{ width: '280px', backgroundColor: '#fff', borderRadius: '15px', padding: '15px', overflowY: 'auto', border: '1px solid #eee' }}>
              {books.map(b => (
                <div key={b.isbn13} onClick={() => setSelectedBook(b)} style={{ display: 'flex', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                  <img src={b.cover} style={{ width: '40px' }} alt="c" />
                  <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{b.title}</div>
                </div>
              ))}
            </div>

            <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '15px', padding: '25px', border: '1px solid #eee', position: 'relative' }}>
              {selectedBook ? (
                <>
                  <h3>『{selectedBook.title}』 작성 중</h3>
                  <div style={{ height: '70%' }}><ReactQuill theme="snow" value={content} onChange={setContent} style={{ height: '90%' }} /></div>
                  <div style={{ position: 'absolute', bottom: '25px', right: '25px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <label style={{ fontSize: '14px' }}><input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} /> 🌐 공개하기</label>
                    <button onClick={saveReview} style={{ padding: '15px 40px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>저장하기</button>
                  </div>
                </>
              ) : <div style={{ color: '#ccc', textAlign: 'center', marginTop: '100px' }}>책을 선택해 주세요.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* 서재 모달 */}
      {isListModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: '85%', height: '85%', backgroundColor: '#fff', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', gap: '15px', alignItems: 'center' }}>
              <button onClick={() => setViewMode('private')} style={{ backgroundColor: viewMode === 'private' ? '#333' : '#eee', color: viewMode === 'private' ? '#fff' : '#333', padding: '10px 20px', borderRadius: '20px', border: 'none', cursor: 'pointer' }}>🔒 내 서재</button>
              <button onClick={() => setViewMode('public')} style={{ backgroundColor: viewMode === 'public' ? '#333' : '#eee', color: viewMode === 'public' ? '#fff' : '#333', padding: '10px 20px', borderRadius: '20px', border: 'none', cursor: 'pointer' }}>🌍 모두의 서재</button>
              <input placeholder="서재 내 검색..." value={listSearchQuery} onChange={e => setListSearchQuery(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ddd' }} />
              <button onClick={() => setIsListModalOpen(false)}>닫기</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
              {filteredReviews.map(rev => (
                <div key={rev.id} onClick={() => { setViewingReview(rev); setIsListModalOpen(false); }} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <img src={rev.cover} style={{ width: '100%', borderRadius: '8px' }} alt="c" />
                  <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '5px' }}>{rev.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 상세보기 모달 (수정/삭제 포함) */}
      {viewingReview && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#fff', width: '650px', maxHeight: '80vh', borderRadius: '20px', padding: '40px', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => { setViewingReview(null); setIsEditing(false); }} style={{ position: 'absolute', top: '20px', right: '20px' }}>&times;</button>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <img src={viewingReview.cover} style={{ width: '100px' }} alt="v" />
              <div>
                <h2>{viewingReview.title}</h2>
                <p>{viewingReview.author}</p>
                {viewingReview.user_id === session.user.id && !isEditing && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setIsEditing(true); setEditContent(viewingReview.content); }}>수정</button>
                    <button onClick={() => deleteReview(viewingReview.id)} style={{ color: 'red' }}>삭제</button>
                  </div>
                )}
              </div>
            </div>
            <hr />
            {isEditing ? (
              <div>
                <ReactQuill theme="snow" value={editContent} onChange={setEditContent} />
                <button onClick={() => updateReview(viewingReview.id)}>완료</button>
              </div>
            ) : <div className="ql-editor" dangerouslySetInnerHTML={{ __html: viewingReview.content }} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;