import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminCard from '../../components/admin/AdminCard';
import AdminButton from '../../components/admin/AdminButton';

// 허용 확장자 목록
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png'];
const VIDEO_EXTS = ['.mp4', '.mov'];
const PDF_EXTS = ['.pdf'];

export default function AdminContentManager() {
  const [banners, setBanners] = useState([]);
  const [videos, setVideos] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [bannerFile, setBannerFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const API_HOST = import.meta.env.VITE_API_HOST || 'http://localhost:4000';
  // 서버에서 현재 파일 목록 가져오기
  const fetchContentFiles = async () => {
    try {
      const res = await axios.get('/api/content-files');
      setBanners(res.data.filter(f => f.type === 'banner'));
      setVideos(res.data.filter(f => f.type === 'video'));
      setPdfs(res.data.filter(f => f.type === 'pdf'));
    } catch (err) {
      console.error('콘텐츠 로딩 실패', err);
    }
  };

  useEffect(() => {
    fetchContentFiles();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/content-files/${id}/permanent`);
      fetchContentFiles();
    } catch {
      alert('삭제 실패');
    }
  };

  // 파일 확장자 검증
  const validateFile = (file, type) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (type === 'banner' && !IMAGE_EXTS.includes(ext)) {
      alert('올바르지 않은 이미지 파일 형식입니다. jpg, jpeg, png만 허용됩니다.');
      return false;
    }
    if (type === 'video' && !VIDEO_EXTS.includes(ext)) {
      alert('올바르지 않은 동영상 파일 형식입니다. mp4, mov만 허용됩니다.');
      return false;
    }
    if (type === 'pdf' && !PDF_EXTS.includes(ext)) {
      alert('올바르지 않은 PDF 파일 형식입니다. pdf만 허용됩니다.');
      return false;
    }
    return true;
  };

  // 업로드 전 유효성 검사 & 전송
  const upload = async (type) => {
    if (type === 'banner') {
      if (!bannerFile) {
        alert('업로드할 배너 이미지를 선택해주세요.');
        return;
      }
      if (!validateFile(bannerFile, 'banner')) {
        setBannerFile(null);
        return;
      }
      if (banners.length >= 4) {
        alert('배너는 최대 4개까지만 업로드 가능합니다.');
        return;
      }
    }
    if (type === 'video') {
      if (!videoFile) {
        alert('업로드할 동영상을 선택해주세요.');
        return;
      }
      if (!validateFile(videoFile, 'video')) {
        setVideoFile(null);
        return;
      }
      if (videos.length >= 1) {
        alert('동영상은 최대 1개까지만 업로드 가능합니다.');
        return;
      }
    }
    if (type === 'pdf') {
      if (!pdfFile) {
        alert('업로드할 PDF 파일을 선택해주세요.');
        return;
      }
      if (!validateFile(pdfFile, 'pdf')) {
        setPdfFile(null);
        return;
      }
      if (pdfs.length >= 1) {
        alert('PDF는 최대 1개까지만 업로드 가능합니다.');
        return;
      }
    }

    const formData = new FormData();
    if (type === 'banner') formData.append('banner', bannerFile);
    if (type === 'video') formData.append('video', videoFile);
    if (type === 'pdf') formData.append('pdf', pdfFile);

    try {
      await axios.post(`/api/upload/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBannerFile(null);
      setVideoFile(null);
      setPdfFile(null);
      fetchContentFiles();
    } catch (err) {
      alert('업로드 실패');
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">콘텐츠 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">배너, 동영상, PDF 파일을 관리하세요</p>
        </div>
      </div>

      {/* Banner Section */}
      <AdminCard title="배너 이미지" subtitle="최대 4개까지 업로드 가능">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) setBannerFile(file);
              }}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-300"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {bannerFile?.name || '선택된 파일 없음'}
            </span>
            <AdminButton
              onClick={() => upload('banner')}
              disabled={!bannerFile || banners.length >= 4}
            >
              업로드
            </AdminButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {banners.length > 0 ? banners.map((b) => (
              <div key={b.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <img
                  src={`${API_HOST}${b.file_path}`}
                  alt="banner-thumb"
                  className="h-32 w-full object-cover"
                />
                <div className="p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 truncate">
                    {b.file_path.split('/').pop()}
                  </p>
                  <AdminButton
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(b.id)}
                    className="w-full"
                  >
                    삭제
                  </AdminButton>
                </div>
              </div>
            )) : (
              <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                등록된 배너가 없습니다.
              </div>
            )}
          </div>
        </div>
      </AdminCard>

      {/* Video Section */}
      <AdminCard title="동영상" subtitle="최대 1개까지 업로드 가능">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) setVideoFile(file);
              }}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-gray-700 dark:file:text-gray-300"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {videoFile?.name || '선택된 파일 없음'}
            </span>
            <AdminButton
              onClick={() => upload('video')}
              disabled={!videoFile || videos.length >= 1}
              variant="success"
            >
              업로드
            </AdminButton>
          </div>

          {videos.length > 0 ? videos.map((v) => (
            <div key={v.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <video
                controls
                className="w-full rounded-t-lg"
                src={`${API_HOST}${v.file_path}`}
              />
              <div className="p-4 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {v.file_path.split('/').pop()}
                </span>
                <AdminButton
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(v.id)}
                >
                  삭제
                </AdminButton>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              등록된 동영상이 없습니다.
            </div>
          )}
        </div>
      </AdminCard>

      {/* PDF Section */}
      <AdminCard title="PDF 문서" subtitle="백서 등록 (최대 1개)">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) setPdfFile(file);
              }}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-gray-700 dark:file:text-gray-300"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {pdfFile?.name || '선택된 파일 없음'}
            </span>
            <AdminButton
              onClick={() => upload('pdf')}
              disabled={!pdfFile || pdfs.length >= 1}
              variant="secondary"
            >
              업로드
            </AdminButton>
          </div>

          {pdfs.length > 0 ? pdfs.map((p) => (
            <div key={p.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">PDF 문서</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.file_path.split('/').pop()}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={`${API_HOST}${p.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    보기
                  </a>
                  <AdminButton
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(p.id)}
                  >
                    삭제
                  </AdminButton>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              등록된 PDF가 없습니다.
            </div>
          )}
        </div>
      </AdminCard>
    </div>
  );
}
