/**
 * NotificationBell.jsx — bildirishnoma qo'ng'irog'i + ochiladigan ro'yxat.
 * Header va ProfilePage (hero karta) ikkalasi ham shu komponentni ishlatadi.
 * Firestore onSnapshot orqali jonli yuklanadi, localStorage'da o'qilgan holat saqlanadi.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle2, AlertCircle, Info, Trash2 } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useModalBackButton } from './profile/useModalBackButton';

const NotificationBell = ({ iconSize = 18, buttonClassName = 'user-avatar-btn', buttonStyle = {}, dropdownStyle = {} }) => {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAllRead, markOneRead, clearAll } = useNotifications();
  const [showMenu, setShowMenu] = useState(false);
  const wrapRef = useRef(null);

  // Android back button closes notification popover
  useModalBackButton(showMenu, () => setShowMenu(false));

  // Tashqariga bosilganda menyuni yopish
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleMarkAll = (e) => { e.stopPropagation(); markAllRead(); };
  const handleClearAll = (e) => { e.stopPropagation(); clearAll(); };

  return (
    <div style={{ position: 'relative' }} ref={wrapRef}>
      <motion.button
        className={buttonClassName}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowMenu(!showMenu)}
        title={t('notifications.title')}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', padding: 0, position: 'relative', ...buttonStyle }}
      >
        <Bell size={iconSize} />
        {unreadCount > 0 && (
          <span className="notif-badge-pill">{unreadCount}</span>
        )}
      </motion.button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            className="user-dropdown glass-panel notif-dropdown"
            style={{ ...dropdownStyle }}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="user-dropdown-header">
              <div className="user-dropdown-header-title">{t('notifications.title')}</div>
              {unreadCount > 0 && (
                <button className="notif-clear-all-btn" onClick={handleMarkAll}>
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>

            <div className="user-dropdown-divider" style={{ margin: 0 }} />

            <div className="notif-list">
              {notifications.length === 0 ? (
                <div className="notif-empty">
                  <Bell size={30} style={{ opacity: 0.25 }} />
                  <span>{t('notifications.empty')}</span>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`notif-item ${n.read ? 'read' : 'unread'}`}
                    onClick={() => markOneRead(n.id)}
                  >
                    <div className={`notif-icon-box ${n.type}`}>
                      {n.type === 'success' ? <CheckCircle2 size={18} /> : n.type === 'warning' ? <AlertCircle size={18} /> : <Info size={18} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="notif-title-row">
                        <div className={`notif-title ${n.read ? 'read' : 'unread'}`}>
                          {n.title}
                        </div>
                        {!n.read && <div className="notif-dot" />}
                      </div>
                      <div className={`notif-msg ${n.read ? 'read' : 'unread'}`}>
                        {n.message}
                      </div>
                      <div className="notif-date">
                        {new Date(n.date).toLocaleDateString()} • {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <>
                <div className="user-dropdown-divider" style={{ margin: 0 }} />
                <button
                  className="user-dropdown-item"
                  style={{ justifyContent: 'center', width: '100%', padding: '12px', color: 'var(--red)', fontSize: '13px' }}
                  onClick={handleClearAll}
                >
                  <Trash2 size={16} style={{ marginRight: '8px' }} /> {t('notifications.clearAll')}
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
