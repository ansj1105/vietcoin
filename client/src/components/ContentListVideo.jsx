import React, { useState, useEffect } from 'react';
import VideoWithPreview from './VideoWithPreview';
import AdvancedLoadingSpinner from './AdvancedLoadingSpinner';
import axios from 'axios';
import '../styles/ContentListVideo.css';

const ContentListVideo = React.memo(() => {
    const [video, setVideo] = useState(null);
    const [loading, setLoading] = useState(true);

    const API_HOST = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

    useEffect(() => {
        const fetchVideo = async () => {
            try {
                const res = await axios.get("/api/content-files");
                const files = res.data;
                const videoFile = files.find(f => f.type === 'video');
                setVideo(videoFile?.file_path || null);
            } catch (err) {
                console.error("❌ 비디오 로딩 실패:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchVideo();
    }, []);

    if (loading) {
        return (
            <div className="video-loading">
                <AdvancedLoadingSpinner text="Loading video..." />
            </div>
        );
    }

    if (!video) {
        return (
            <div className="video-empty">
                <p className="text-sm">업로드된 비디오가 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="video-container">
            <VideoWithPreview
                src={`${API_HOST}${video}`}
                className="w-full h-full"
            />
        </div>
    );
});

export default ContentListVideo; 