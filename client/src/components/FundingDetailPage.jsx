// 📁 src/pages/FundingDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Mail, DollarSign, Clock } from "lucide-react";
import '../styles/topbar.css';
import '../styles/FundingDetailPage.css';
import AlertPopup from './AlertPopup';

export default function FundingDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [investors, setInvestors] = useState([]);
  const [amount, setAmount] = useState("");
  const [availableBalance, setAvailableBalance] = useState(0);
  const [error, setError] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ title: '', message: '', type: 'success' });

  useEffect(() => {
    (async () => {
      try {
        const [projRes, balRes] = await Promise.all([
          axios.get(`/api/projects/${id}/summary`, { withCredentials: true }),
          axios.get(`/api/wallet/finance-summary`, { withCredentials: true })
        ]);
        const { project: projData, currentAmount, investors: invList } = projRes.data;
        setProject({ ...projData, currentAmount });
        setInvestors(invList);
        setAvailableBalance(parseFloat(balRes.data.data.fundBalance || 0));
      } catch (err) {
        console.error(t("funding.detail2.loadError"), err);
      }
    })();
  }, [id, t]);

  const handleSubscribe = async () => {
    setError("");
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return setError(t("funding.detail2.invalidAmount"));
    }
    if (amt < project.minAmount || amt > project.maxAmount) {
      return setError(
        t("funding.detail2.amountRange", { min: project.minAmount, max: project.maxAmount })
      );
    }
    const remaining = project.targetAmount - project.currentAmount;
    if (amt > remaining) {
      return setError(t("funding.detail2.exceedRemaining", { remaining: remaining.toFixed(6) }));
    }
    if (amt > availableBalance) {
      return setError(t("funding.detail2.insufficientBalance"));
    }
    try {
      await axios.post(
        `/api/wallet/projects/${id}/invest`,
        { amount: amt },
        { withCredentials: true }
      );
      setAlertInfo({
        title: t('funding.detail2.subscribeSuccessTitle'),
        message: t('funding.detail2.subscribeSuccessWithAmount', { amount: amt }),
        type: 'success'
      });
      setShowAlert(true);
    } catch (err) {
      setAlertInfo({
        title: t('funding.detail2.subscribeErrorTitle'),
        message: err.response?.data?.error || t('funding.detail2.subscribeError'),
        type: 'error'
      });
      setShowAlert(true);
    }
  };

  if (!project) {
    return <div className="text-center mt-10 text-gray-400">{t("funding.detail2.loading")}</div>;
  }

  return (
    <div className="funding-wrapper">
      <div className="funding-top-bar1">
        <button onClick={() => navigate(-1)} className="back-button">←</button>

        <h2 className="project-title">{project.name}</h2>
      </div>
      <div className="funding-top-bar2">
        <p className="project-info">
          {t("funding.detail2.descriptionLabel")} {project.description}
        </p>
        <p className="project-info">
          {t("funding.detail2.cycleLabel", { cycle: project.cycle })}
        </p>
        <p className="project-info">
          {t("funding.detail2.dailyRateLabel", { rate: project.dailyRate })}
        </p>
        <p className="project-info">
          {t("funding.detail2.minMaxLabel", { min: project.minAmount, max: project.maxAmount })}
        </p>
        <p className="project-info">
          {t("funding.detail2.targetLabel", { target: project.targetAmount })}
        </p>
        <p className="project-info">
          {t("funding.detail2.currentLabel", { current: project.currentAmount })}
        </p>
        <p className="project-available">
          {t("funding.detail2.availableLabel", { balance: availableBalance })}
        </p>

        <input
          type="number"
          className="amount-input"
          placeholder={t("funding.detail2.amountPlaceholder")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {error && <p className="error-text">{error}</p>}

        <button className="subscribe-button" onClick={handleSubscribe}>
          {t("funding.detail2.subscribe")}
        </button>
      </div>
      <div className="funding-top-bar3">
        <h3 className="investor-title">{t("funding.detail2.investorsTitle")}</h3>
        {investors.length === 0 ? (
          <p className="no-investors">{t("funding.detail2.noInvestors")}</p>
        ) : (
          <ul className="investor-list">
            {investors.map((inv) => (
              <li key={inv.id} className="investor-item">
                <Mail size={16} /> {inv.email.replace(/^(.{2})(.*)(@.*)$/, '$1***$3')} - <DollarSign size={16} /> {inv.amount} USDT - <Clock size={16} />{' '}
                {new Date(inv.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </div>
      {showAlert && (
        <AlertPopup
          isOpen={showAlert}
          onClose={() => {
            setShowAlert(false);
            if (alertInfo.type === 'success') navigate('/funding');
          }}
          title={alertInfo.title}
          message={alertInfo.message}
          type={alertInfo.type}
        />
      )}
    </div>
  );
}