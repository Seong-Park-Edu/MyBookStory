import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      alert('체크! 이메일로 로그인 링크를 보냈습니다.')
    } catch (error) {
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
      <form onSubmit={handleLogin} style={{ textAlign: 'center', padding: '20px', border: '1px solid #ddd', borderRadius: '10px' }}>
        <h2>🔐 MyBookStory 로그인</h2>
        <p>이메일을 입력하면 로그인 링크를 보내드려요!</p>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '10px', width: '250px', marginBottom: '10px' }}
        />
        <br />
        <button disabled={loading} style={{ padding: '10px 20px', cursor: 'pointer', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px' }}>
          {loading ? '전송 중...' : '로그인 링크 보내기'}
        </button>
      </form>
    </div>
  )
}