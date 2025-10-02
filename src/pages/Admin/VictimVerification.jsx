import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Phone,
  Calendar,
  Image as ImageIcon,
  ZoomIn
} from 'lucide-react';
import { http } from '@/api/client';

/**
 * Victim Verification Page
 *
 * Features:
 * - List pending victim verification requests
 * - View damage photos and details
 * - Approve or reject with notes
 */
export default function VictimVerification() {
  const [requests, setRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedRequest, setSelectedRequest] = React.useState(null);
  const [actionType, setActionType] = React.useState(null); // 'approve' | 'reject'
  const [actionNotes, setActionNotes] = React.useState('');
  const [rejectReason, setRejectReason] = React.useState('');
  const [lightboxImage, setLightboxImage] = React.useState(null);

  React.useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual admin endpoint
      const response = await http.get('/admin/users', {
        params: {
          role: 'victim',
          status: 'pending_verification'
        }
      }).catch(() => []);

      setRequests(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load verification requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (request) => {
    setSelectedRequest(request);
    setActionType('approve');
    setActionNotes('');
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setActionType('reject');
    setRejectReason('');
    setActionNotes('');
  };

  const submitAction = async () => {
    if (!selectedRequest) return;

    try {
      const payload = {
        user_id: selectedRequest.id,
        action: actionType,
        notes: actionNotes
      };

      if (actionType === 'reject') {
        payload.reason = rejectReason;
      }

      // TODO: Replace with actual endpoint
      await http.post('/admin/verify-victim', payload);

      alert(`${actionType === 'approve' ? '已批准' : '已拒絕'}驗證請求`);

      // Reset state and reload
      setSelectedRequest(null);
      setActionType(null);
      setActionNotes('');
      setRejectReason('');
      loadRequests();
    } catch (error) {
      console.error('Failed to process verification:', error);
      alert(`處理失敗: ${error.message}`);
    }
  };

  const getDamageLevelBadge = (level) => {
    const badges = {
      minor: { color: 'bg-yellow-100 text-yellow-800', label: '輕微' },
      moderate: { color: 'bg-orange-100 text-orange-800', label: '中度' },
      severe: { color: 'bg-red-100 text-red-800', label: '嚴重' },
      critical: { color: 'bg-red-600 text-white', label: '危急' }
    };
    return badges[level] || badges.minor;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">受災戶審核</h2>
        <p className="text-gray-600 mt-1">審核並驗證受災戶申請</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{requests.length}</p>
                <p className="text-sm text-gray-600">待審核</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center text-gray-500">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">沒有待審核的申請</p>
              <p className="text-sm mt-2">所有受災戶驗證都已處理完畢</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {requests.map((request) => {
            const damageBadge = getDamageLevelBadge(request.damage_level);

            return (
              <Card key={request.id} className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{request.full_name || request.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={damageBadge.color}>
                          {damageBadge.label}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {new Date(request.created_at).toLocaleDateString('zh-TW')}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Info */}
                  <div className="space-y-2 text-sm">
                    {request.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{request.phone}</span>
                      </div>
                    )}
                    {request.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="flex-1">{request.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Damage Description */}
                  {request.damage_description && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">{request.damage_description}</p>
                    </div>
                  )}

                  {/* Damage Photos */}
                  {request.damage_photos && request.damage_photos.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">損壞照片 ({request.damage_photos.length})</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {request.damage_photos.map((photo, index) => (
                          <button
                            key={index}
                            onClick={() => setLightboxImage(photo)}
                            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity group"
                          >
                            <img
                              src={photo}
                              alt={`損壞照片 ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                              <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={() => handleApprove(request)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      批准
                    </Button>
                    <Button
                      onClick={() => handleReject(request)}
                      variant="outline"
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      拒絕
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Approval/Rejection Dialog */}
      <Dialog open={!!actionType} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? '批准驗證' : '拒絕驗證'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && `處理 ${selectedRequest.full_name || selectedRequest.name} 的驗證申請`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionType === 'reject' && (
              <div>
                <label className="text-sm font-medium mb-2 block">拒絕原因</label>
                <Select value={rejectReason} onValueChange={setRejectReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇拒絕原因" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insufficient_evidence">證據不足</SelectItem>
                    <SelectItem value="invalid_photos">照片無效</SelectItem>
                    <SelectItem value="duplicate_request">重複申請</SelectItem>
                    <SelectItem value="out_of_area">不在服務區域</SelectItem>
                    <SelectItem value="other">其他原因</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">備註說明</label>
              <Textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={actionType === 'approve' ? '(選填) 給申請人的訊息...' : '請說明拒絕的詳細原因...'}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              取消
            </Button>
            <Button
              onClick={submitAction}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              disabled={actionType === 'reject' && !rejectReason}
            >
              確認{actionType === 'approve' ? '批准' : '拒絕'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>損壞照片</DialogTitle>
          </DialogHeader>
          {lightboxImage && (
            <div className="flex items-center justify-center">
              <img
                src={lightboxImage}
                alt="損壞照片"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
