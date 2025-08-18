import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ContentListBanner from './ContentListBanner';
import ContentListVideo from './ContentListVideo';
import AdvancedLoadingSpinner from './AdvancedLoadingSpinner';
import '../styles/MainLanding.css';

const ContentList = React.memo(() => {
  const API_HOST = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  const [banners, setBanners] = useState([]);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await axios.get("/api/content-files");
        const files = res.data;
        setBanners(files.filter(f => f.type === 'banner'));
        const videoFile = files.find(f => f.type === 'video');
        setVideo(videoFile?.file_path || null);
      } catch (err) {
        console.error("❌ 콘텐츠 로딩 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <AdvancedLoadingSpinner text="Loading content..." />
      </div>
    );
  }

  const noContent = banners.length === 0 && !video;

  return (
    <div className="content-wrapper w-full max-w-full px-2 sm:px-4 md:px-6 lg:px-8">
      {noContent ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm sm:text-base">업로드된 파일이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* 배너 컴포넌트 */}
          <ContentListBanner banners={banners} API_HOST={API_HOST} />

          {/* 비디오 컴포넌트 */}
          <ContentListVideo video={video} API_HOST={API_HOST} />
        </div>
      )}
    </div>
  );
});

export default ContentList;
