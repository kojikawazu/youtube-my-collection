
import React, { useState, useMemo, useEffect } from 'react';
import { Screen, VideoItem, SortOption, Category } from './types';
import { INITIAL_VIDEOS } from './data';
import { Rating } from './components/Rating';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { Modal } from './components/Modal';
import { CATEGORIES } from './constants';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.List);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [videos, setVideos] = useState<VideoItem[]>(INITIAL_VIDEOS);
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'info';
  }>({
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'info'
  });

  // Form State
  const [formData, setFormData] = useState<Partial<VideoItem>>({});

  // Navigation handlers
  const navigateToList = () => {
    setCurrentScreen(Screen.List);
    setSelectedVideo(null);
    window.scrollTo(0, 0);
  };

  const navigateToDetail = (video: VideoItem) => {
    setSelectedVideo(video);
    setCurrentScreen(Screen.Detail);
    window.scrollTo(0, 0);
  };

  const navigateToLogin = () => {
    setCurrentScreen(Screen.Login);
    window.scrollTo(0, 0);
  };

  const navigateToAdd = () => {
    setFormData({
      title: '',
      youtubeUrl: '',
      category: 'プログラミング',
      rating: 3,
      tags: [],
      goodPoints: '',
      memo: ''
    });
    setCurrentScreen(Screen.Add);
    window.scrollTo(0, 0);
  };

  const navigateToEdit = (video: VideoItem) => {
    setFormData({ ...video });
    setCurrentScreen(Screen.Edit);
    window.scrollTo(0, 0);
  };

  const handleLogin = () => {
    setIsAdmin(true);
    navigateToList();
  };

  const handleLogout = () => {
    setIsAdmin(false);
    navigateToList();
  };

  const openDeleteModal = (id: string, title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setModalConfig({
      title: '動画を削除しますか？',
      message: `「${title}」をコレクションから完全に削除します。この操作は取り消せません。`,
      variant: 'danger',
      onConfirm: () => {
        setVideos(prev => prev.filter(v => v.id !== id));
        if (selectedVideo?.id === id) navigateToList();
      }
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.youtubeUrl) {
      alert('タイトルとURLは必須です');
      return;
    }

    const saveAction = () => {
      if (currentScreen === Screen.Add) {
        const newVideo: VideoItem = {
          ...(formData as VideoItem),
          id: Date.now().toString(),
          thumbnailUrl: `https://picsum.photos/seed/${Date.now()}/640/360`,
          addedDate: new Date().toISOString(),
          publishDate: new Date().toISOString(),
        };
        setVideos([newVideo, ...videos]);
        navigateToList();
      } else if (currentScreen === Screen.Edit && selectedVideo) {
        const updatedVideos = videos.map(v => 
          v.id === selectedVideo.id ? { ...v, ...formData } as VideoItem : v
        );
        setVideos(updatedVideos);
        setSelectedVideo({ ...selectedVideo, ...formData } as VideoItem);
        setCurrentScreen(Screen.Detail);
      }
    };

    setModalConfig({
      title: '情報を保存しますか？',
      message: '入力した内容で動画情報を更新します。',
      variant: 'info',
      onConfirm: saveAction
    });
    setIsModalOpen(true);
  };

  // Sorted list
  const sortedVideos = useMemo(() => {
    const list = [...videos];
    switch (sortOption) {
      case 'newest':
        return list.sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime());
      case 'future':
        return list.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
      case 'rating':
        return list.sort((a, b) => b.rating - a.rating);
      default:
        return list;
    }
  }, [videos, sortOption]);

  // Screen components
  const ListView = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-red-900">マイ・ライブラリ</h1>
          <p className="text-red-700/60 text-sm">あなたのお気に入り動画コレクション</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-red-700 uppercase tracking-wider">並び替え:</label>
          <select 
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="bg-white border border-red-100 text-red-900 text-sm rounded-full px-4 py-2 focus:ring-2 focus:ring-red-200 outline-none shadow-sm transition-all"
          >
            <option value="newest">追加日が新しい順</option>
            <option value="future">公開日が新しい順</option>
            <option value="rating">評価が高い順</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedVideos.map(video => (
          <div 
            key={video.id}
            onClick={() => navigateToDetail(video)}
            className="group bg-white rounded-3xl overflow-hidden border border-red-50 hover:border-red-100 shadow-sm hover:shadow-md transition-all cursor-pointer relative"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden">
              <img 
                src={video.thumbnailUrl} 
                alt={video.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-red-800 shadow-sm">
                {video.category}
              </div>
              {isAdmin && (
                <button 
                  onClick={(e) => openDeleteModal(video.id, video.title, e)}
                  className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-colors backdrop-blur shadow-sm z-10"
                  title="削除"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-bold text-red-900 mb-2 line-clamp-2 leading-tight group-hover:text-red-500 transition-colors">
                {video.title}
              </h3>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {video.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-medium">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between mt-auto">
                <Rating value={video.rating} size="sm" />
                <span className="text-[10px] text-gray-400">
                  {new Date(video.addedDate).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const DetailView = () => {
    if (!selectedVideo) return null;
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={navigateToList}
            className="flex items-center gap-2 text-sm font-bold text-red-400 hover:text-red-600 transition-colors group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            一覧に戻る
          </button>
          
          {isAdmin && (
            <div className="flex gap-3">
              <button 
                onClick={() => navigateToEdit(selectedVideo)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-100 text-red-600 text-xs font-bold rounded-full hover:bg-red-50 transition-colors shadow-sm"
              >
                編集する
              </button>
              <button 
                onClick={() => openDeleteModal(selectedVideo.id, selectedVideo.title)}
                className="flex items-center justify-center w-10 h-10 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl overflow-hidden border border-red-50 shadow-xl shadow-red-500/5">
          {/* Hero Thumbnail */}
          <div className="relative aspect-video">
            <img 
              src={selectedVideo.thumbnailUrl} 
              alt={selectedVideo.title} 
              className="w-full h-full object-cover"
            />
            <a 
              href={selectedVideo.youtubeUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors group"
            >
              <div className="w-16 h-16 bg-white/95 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-500 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </a>
          </div>

          <div className="p-6 sm:p-10">
            {/* Category & Date */}
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-widest">
                {selectedVideo.category}
              </span>
              <span className="text-sm text-gray-400">
                公開日: {new Date(selectedVideo.publishDate).toLocaleDateString('ja-JP')}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-red-950 mb-4 leading-tight">
              {selectedVideo.title}
            </h1>

            <div className="flex items-center gap-4 mb-8">
              <Rating value={selectedVideo.rating} size="lg" />
              <div className="h-4 w-px bg-gray-100"></div>
              <div className="flex gap-2">
                {selectedVideo.tags.map(tag => (
                  <span key={tag} className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded-lg">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-red-50 pt-8">
              <section>
                <h2 className="text-sm font-bold text-red-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-red-400 rounded-full"></span>
                  Good Points
                </h2>
                <MarkdownRenderer content={selectedVideo.goodPoints} />
              </section>

              <section>
                <h2 className="text-sm font-bold text-red-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-red-200 rounded-full"></span>
                  Memo
                </h2>
                <MarkdownRenderer content={selectedVideo.memo} />
              </section>
            </div>
            
            <div className="mt-10 pt-6 border-t border-red-50 text-center">
               <a 
                 href={selectedVideo.youtubeUrl}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="inline-flex items-center gap-3 bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-3 rounded-2xl shadow-lg shadow-red-200 transition-all hover:-translate-y-0.5"
               >
                 <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                 YouTubeで見る
               </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const EditorView = () => (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-red-900">
          {currentScreen === Screen.Add ? '新しい動画を追加' : '動画情報を編集'}
        </h1>
        <p className="text-red-700/60 text-sm">コレクションを充実させましょう</p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-red-50 shadow-xl shadow-red-500/5 space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-red-800 uppercase tracking-widest">タイトル</label>
          <input 
            type="text" 
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder="動画のタイトルを入力"
            className="w-full bg-red-50/30 border border-red-100 rounded-2xl px-5 py-3 text-red-900 focus:ring-2 focus:ring-red-200 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-red-800 uppercase tracking-widest">YouTube URL</label>
          <input 
            type="text" 
            value={formData.youtubeUrl}
            onChange={e => setFormData({ ...formData, youtubeUrl: e.target.value })}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full bg-red-50/30 border border-red-100 rounded-2xl px-5 py-3 text-red-900 focus:ring-2 focus:ring-red-200 outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-red-800 uppercase tracking-widest">カテゴリー</label>
            <select 
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value as Category })}
              className="w-full bg-red-50/30 border border-red-100 rounded-2xl px-5 py-3 text-red-900 focus:ring-2 focus:ring-red-200 outline-none transition-all"
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-red-800 uppercase tracking-widest">評価 (1-5)</label>
            <div className="flex items-center gap-4 h-[50px]">
              {[1, 2, 3, 4, 5].map(num => (
                <button 
                  key={num}
                  onClick={() => setFormData({ ...formData, rating: num })}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    formData.rating === num ? 'bg-red-500 text-white shadow-md' : 'bg-red-50 text-red-300 hover:bg-red-100'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-red-800 uppercase tracking-widest">タグ (カンマ区切り)</label>
          <input 
            type="text" 
            value={formData.tags?.join(', ')}
            onChange={e => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
            placeholder="React, デザイン, ピアノ..."
            className="w-full bg-red-50/30 border border-red-100 rounded-2xl px-5 py-3 text-red-900 focus:ring-2 focus:ring-red-200 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-red-800 uppercase tracking-widest">Good Points (Markdown可)</label>
          <textarea 
            rows={4}
            value={formData.goodPoints}
            onChange={e => setFormData({ ...formData, goodPoints: e.target.value })}
            placeholder="- ここが良い！&#10;- こんな発見があった"
            className="w-full bg-red-50/30 border border-red-100 rounded-2xl px-5 py-3 text-red-900 focus:ring-2 focus:ring-red-200 outline-none transition-all resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-red-800 uppercase tracking-widest">Memo (Markdown可)</label>
          <textarea 
            rows={3}
            value={formData.memo}
            onChange={e => setFormData({ ...formData, memo: e.target.value })}
            placeholder="自分へのメモ..."
            className="w-full bg-red-50/30 border border-red-100 rounded-2xl px-5 py-3 text-red-900 focus:ring-2 focus:ring-red-200 outline-none transition-all resize-none"
          />
        </div>

        <div className="pt-6 flex flex-col sm:flex-row gap-4">
          <button 
            onClick={handleSave}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-100 transition-all hover:-translate-y-0.5"
          >
            保存する
          </button>
          <button 
            onClick={() => currentScreen === Screen.Add ? navigateToList() : navigateToDetail(selectedVideo!)}
            className="flex-1 bg-white border border-red-100 text-red-400 font-bold py-4 rounded-2xl hover:bg-red-50 transition-all"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );

  const LoginView = () => (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-[2rem] border border-red-50 shadow-2xl shadow-red-500/5 p-8 sm:p-12 text-center">
        <div className="mb-8 relative inline-block">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 border-4 border-white rounded-full"></div>
        </div>
        
        <h1 className="text-2xl font-bold text-red-950 mb-2">管理者ログイン</h1>
        <p className="text-sm text-red-800/50 mb-10 leading-relaxed">
          このセクションは管理者専用です。<br />動画の追加、編集、削除を行うことができます。
        </p>

        <button 
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-700 font-bold py-4 px-6 rounded-2xl transition-all shadow-sm mb-6"
        >
          <svg className="w-6 h-6" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
          </svg>
          Googleでサインイン
        </button>

        <button 
          onClick={navigateToList}
          className="text-sm font-medium text-red-400 hover:text-red-600 transition-colors"
        >
          ゲストとして戻る
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-red-50 py-4 px-6 flex items-center justify-between shadow-sm">
        <div 
          onClick={navigateToList} 
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center shadow-lg shadow-red-200 group-hover:scale-105 transition-transform">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
          </div>
          <span className="font-bold text-red-900 tracking-tight text-lg">TubeHub</span>
        </div>

        <div className="flex items-center gap-4">
          {isAdmin ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-xs font-bold text-red-900">Admin</span>
              </div>
              <button 
                onClick={handleLogout}
                className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-widest"
              >
                Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={navigateToLogin}
              className="flex items-center gap-2 text-red-400 hover:text-red-600 transition-colors"
              title="管理者ログイン"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="animate-in fade-in duration-500">
        {currentScreen === Screen.List && <ListView />}
        {currentScreen === Screen.Detail && <DetailView />}
        {currentScreen === Screen.Login && <LoginView />}
        {(currentScreen === Screen.Add || currentScreen === Screen.Edit) && <EditorView />}
      </main>

      {/* Custom Modal */}
      <Modal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        variant={modalConfig.variant}
        confirmLabel={modalConfig.variant === 'danger' ? '削除する' : '保存する'}
      />

      {/* Admin Floating Action Button (Only in List View) */}
      {isAdmin && currentScreen === Screen.List && (
        <button 
          onClick={navigateToAdd}
          className="fixed bottom-8 right-8 w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-red-500/30 hover:bg-red-600 hover:scale-110 transition-all z-40"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default App;
