'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useInstanceSocket } from '@/hooks/use-instance-socket'
import { useInstancesStore, type Instance } from '@/stores/instances.store'
import { apiGet } from '@/lib/api'

const QR_TIMEOUT_SECONDS = 30
const STATUS_POLL_INTERVAL = 5_000

interface QrCodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  instanceId: string | null
  onRequestQr: (id: string) => Promise<string>
}

export function QrCodeModal({ open, onOpenChange, instanceId, onRequestQr }: QrCodeModalProps) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(QR_TIMEOUT_SECONDS)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleQrUpdated = useCallback(
    (payload: { instanceId: string; qrCode: string }) => {
      if (payload.instanceId === instanceId) {
        setQrCode(payload.qrCode)
        setCountdown(QR_TIMEOUT_SECONDS)
      }
    },
    [instanceId],
  )

  useInstanceSocket(handleQrUpdated)

  // Auto-close when instance becomes CONNECTED via store subscription
  const instanceStatus = useInstancesStore((s) =>
    instanceId ? s.instances.find((i) => i.id === instanceId)?.status : undefined
  )

  const updateInstanceStatus = useInstancesStore((s) => s.updateInstanceStatus)

  useEffect(() => {
    if (open && instanceStatus === 'CONNECTED') {
      onOpenChange(false)
    }
  }, [open, instanceStatus, onOpenChange])

  // Polling fallback — if WebSocket misses the status update, poll the API
  useEffect(() => {
    if (!open || !instanceId) return

    const interval = setInterval(async () => {
      try {
        const res = await apiGet<{ data: Instance }>(`instances/${instanceId}`)
        if (res.data.status === 'CONNECTED') {
          updateInstanceStatus(instanceId, 'CONNECTED', res.data.phone)
        }
      } catch {
        // Ignore polling errors silently
      }
    }, STATUS_POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [open, instanceId, updateInstanceStatus])

  // Request QR on open
  useEffect(() => {
    if (!open || !instanceId) return

    setLoading(true)
    setQrCode(null)
    setCountdown(QR_TIMEOUT_SECONDS)

    onRequestQr(instanceId)
      .then((qr) => {
        setQrCode(qr)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [open, instanceId, onRequestQr])

  // Countdown timer
  useEffect(() => {
    if (!open || !qrCode) return

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (instanceId) {
            setLoading(true)
            onRequestQr(instanceId)
              .then((qr) => {
                setQrCode(qr)
                setLoading(false)
              })
              .catch(() => setLoading(false))
          }
          return QR_TIMEOUT_SECONDS
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [open, qrCode, instanceId, onRequestQr])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com seu WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* QR Code */}
          <div className="rounded-lg border p-4 bg-white">
            {loading || !qrCode ? (
              <Skeleton className="h-[200px] w-[200px]" />
            ) : (
              <img
                src={qrCode}
                alt="QR Code WhatsApp"
                width={200}
                height={200}
                className="h-[200px] w-[200px]"
              />
            )}
          </div>

          {/* Countdown */}
          {qrCode && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                QR expira em{' '}
                <span className="font-semibold text-foreground">{countdown}s</span>
              </p>
              <div className="mt-2 h-1 w-48 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / QR_TIMEOUT_SECONDS) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1 text-center">
            <p>1. Abra o WhatsApp no celular</p>
            <p>2. Toque em Mais opcoes ou Configuracoes</p>
            <p>3. Toque em Aparelhos conectados</p>
            <p>4. Toque em Conectar um aparelho</p>
            <p>5. Aponte o celular para este QR Code</p>
          </div>

          {/* Manual refresh */}
          {!loading && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (instanceId) {
                  setLoading(true)
                  onRequestQr(instanceId)
                    .then((qr) => {
                      setQrCode(qr)
                      setCountdown(QR_TIMEOUT_SECONDS)
                      setLoading(false)
                    })
                    .catch(() => setLoading(false))
                }
              }}
            >
              Atualizar QR Code
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
