import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { useAuth } from '../../../hooks/useAuth';
import { Monitor, Smartphone, Tablet, Globe, MapPin, Clock, AlertTriangle, Shield } from 'lucide-react';
import { UserSession } from '../../../services/auth.service';

export const SessionManagement: React.FC = () => {
  const { t } = useTranslation();
  const { sessions, sessionsLoading, loadSessions, revokeSession, revokeAllOtherSessions } = useAuth();
  
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return <Monitor className="w-4 h-4" />;
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="w-4 h-4" />;
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  const getBrowserInfo = (userAgent?: string) => {
    if (!userAgent) return t('common.unknown');
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    return t('common.unknown');
  };

  const getOSInfo = (userAgent?: string) => {
    if (!userAgent) return t('common.unknown');
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('ios')) return 'iOS';
    return t('common.unknown');
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t('time.justNow');
    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    return t('time.daysAgo', { count: diffDays });
  };

  const handleRevokeSession = async () => {
    if (!selectedSession) return;
    
    try {
      setIsRevoking(true);
      await revokeSession(selectedSession.id);
      setShowRevokeDialog(false);
      setSelectedSession(null);
    } catch (error) {
      console.error('Failed to revoke session:', error);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRevokeAllOther = async () => {
    try {
      setIsRevoking(true);
      await revokeAllOtherSessions();
      setShowRevokeAllDialog(false);
    } catch (error) {
      console.error('Failed to revoke all sessions:', error);
    } finally {
      setIsRevoking(false);
    }
  };

  const currentSession = Array.isArray(sessions) ? sessions.find(session => session.is_current) : undefined;
  const otherSessions = Array.isArray(sessions) ? sessions.filter(session => !session.is_current) : [];

  if (sessionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('settings.sessions.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('settings.sessions.title')}</h3>
          <p className="text-sm text-gray-600">{t('settings.sessions.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadSessions} variant="outline" size="sm">
            {t('common.refresh')}
          </Button>
          {otherSessions.length > 0 && (
            <Button 
              onClick={() => setShowRevokeAllDialog(true)} 
              variant="destructive" 
              size="sm"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              {t('settings.sessions.revokeAllOther')}
            </Button>
          )}
        </div>
      </div>

      {/* Current Session */}
      {currentSession && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-600" />
              {t('settings.sessions.currentSession')}
            </CardTitle>
            <CardDescription>
              {t('settings.sessions.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {getDeviceIcon(currentSession.user_agent)}
                  <span className="font-medium">{t('settings.sessions.device')}</span>
                  <span className="text-gray-600">{getBrowserInfo(currentSession.user_agent)} • {getOSInfo(currentSession.user_agent)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span className="font-medium">{t('settings.sessions.ipAddress')}</span>
                  <span className="text-gray-600">{currentSession.ip_address || t('common.unknown')}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">{t('settings.sessions.lastActive')}</span>
                  <span className="text-gray-600">{formatLastActive(currentSession.last_activity_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t('settings.sessions.createdAt')}</span>
                  <span className="text-gray-600">{new Date(currentSession.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Sessions */}
      <div>
        <h4 className="text-md font-semibold mb-4">{t('settings.sessions.otherSessions')}</h4>
        {otherSessions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">{t('settings.sessions.noOtherSessions')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {otherSessions.map((session) => (
              <Card key={session.id} className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getDeviceIcon(session.user_agent)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getBrowserInfo(session.user_agent)}</span>
                          <Badge variant="outline" className="text-xs">
                            {getOSInfo(session.user_agent)}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {session.ip_address && (
                            <span className="mr-4">{session.ip_address}</span>
                          )}
                          <span>{formatLastActive(session.last_activity_at)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSession(session);
                        setShowRevokeDialog(true);
                      }}
                    >
                      {t('settings.sessions.revokeSession')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Revoke Single Session Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.sessions.confirmRevoke')}</DialogTitle>
            <DialogDescription>
              {t('settings.sessions.confirmRevokeMessage')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRevokeSession}
              disabled={isRevoking}
            >
              {isRevoking ? t('common.processing') : t('settings.sessions.revokeSession')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke All Sessions Dialog */}
      <Dialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.sessions.confirmRevokeAll')}</DialogTitle>
            <DialogDescription>
              {t('settings.sessions.confirmRevokeAllMessage')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeAllDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRevokeAllOther}
              disabled={isRevoking}
            >
              {isRevoking ? t('common.processing') : t('settings.sessions.revokeAllOther')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};