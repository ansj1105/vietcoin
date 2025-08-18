import React, { useState, useEffect } from 'react';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import axios from 'axios';
import AdvancedLoadingSpinner from './AdvancedLoadingSpinner';
import '../styles/ContentListBanner.css';

const ContentListBanner = React.memo(() => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);

    const API_HOST = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const res = await axios.get("/api/content-files");
                const files = res.data;
                const bannerFiles = files.filter(f => f.type === 'banner');
                setBanners(bannerFiles);
            } catch (err) {
                console.error("❌ 배너 로딩 실패:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchBanners();
    }, []);

    if (loading) {
        return (
            <div className="banner-loading">
                <AdvancedLoadingSpinner text="Loading banners..." />
            </div>
        );
    }

    if (!banners || banners.length === 0) {
        return (
            <div className="banner-empty">
                <p className="text-sm">업로드된 배너가 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="banner-container">
            <div className="banner-slider">
                <Slider
                    dots
                    infinite
                    autoplay
                    autoplaySpeed={3000}
                    afterChange={idx => setCurrentSlide(idx)}
                    customPaging={i => (
                        <div
                            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-300 ${currentSlide === i ? 'bg-white scale-110' : 'bg-gray-400'
                                }`}
                        />
                    )}
                    appendDots={dots => (
                        <div>
                            <ul className="absolute bottom-3 sm:bottom-4 left-0 right-0 flex justify-center space-x-1 sm:space-x-2 z-10">
                                {dots}
                            </ul>
                        </div>
                    )}
                    responsive={[
                        {
                            breakpoint: 640,
                            settings: {
                                dots: true,
                                arrows: false,
                                autoplay: true,
                                autoplaySpeed: 4000,
                            }
                        },
                        {
                            breakpoint: 768,
                            settings: {
                                dots: true,
                                arrows: false,
                                autoplay: true,
                                autoplaySpeed: 3500,
                            }
                        }
                    ]}
                >
                    {banners.map((banner, idx) => (
                        <div key={idx} className="banner-slider overflow-hidden rounded-lg">
                            <img
                                src={`${API_HOST}${banner.file_path}`}
                                alt={`banner-${idx}`}
                                className="w-full h-full object-cover object-center"
                                loading="lazy"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        </div>
                    ))}
                </Slider>
            </div>
        </div>
    );
});

export default ContentListBanner; 