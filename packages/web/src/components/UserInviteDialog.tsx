import React, { useState } from 'react';
import { PiX, PiUserPlus, PiEnvelope, PiUpload } from 'react-icons/pi';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import InputText from './InputText';
import Textarea from './Textarea';
import Alert from './Alert';
import LoadingWave from './LoadingWave';
import useHttp from '../hooks/useHttp';

interface UserInviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSuccess?: () => void;
}

interface InviteResult {
  email: string;
  success: boolean;
  username?: string;
  temporaryPassword?: string;
  error?: string;
}

interface InviteResponse {
  results: InviteResult[];
  summary: {
    totalRequested: number;
    successful: number;
    failed: number;
  };
}

const UserInviteDialog: React.FC<UserInviteDialogProps> = ({
  isOpen,
  onClose,
  onInviteSuccess,
}) => {
  const { t } = useTranslation();
  const { api } = useHttp();

  const [inviteMode, setInviteMode] = useState<'single' | 'bulk'>('single');
  const [singleEmail, setSingleEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [sendEmail, setSendEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InviteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUnconfiguredWarning, setShowUnconfiguredWarning] = useState(false);
  const [pendingInvitation, setPendingInvitation] = useState<{
    emails: string[];
    sendEmail: boolean;
  } | null>(null);
  const [unconfiguredEmails, setUnconfiguredEmails] = useState<string[]>([]);

  const handleClose = () => {
    setSingleEmail('');
    setBulkEmails('');
    setCsvFile(null);
    setSendEmail(false);
    setResults(null);
    setError(null);
    setShowUnconfiguredWarning(false);
    setPendingInvitation(null);
    setUnconfiguredEmails([]);
    onClose();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // Accept common CSV MIME types
    const acceptedMimeTypes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'text/plain',
      'text/x-csv',
      'application/x-csv',
      'text/comma-separated-values',
      'text/x-comma-separated-values',
    ];

    // Check MIME type OR file extension as fallback
    const isValidCSV =
      acceptedMimeTypes.includes(file.type) ||
      file.type === '' || // Handle empty MIME type
      file.name.toLowerCase().endsWith('.csv');

    if (isValidCSV) {
      setCsvFile(file);
      setBulkEmails(''); // Clear manual input when file is selected
    } else {
      console.error(`Invalid file type: ${file.type}, name: ${file.name}`);
      alert(t('adminPortal.invite.errors.invalidFile'));
    }
  };

  const parseCSV = (csvContent: string): string[] => {
    const lines = csvContent.trim().split('\n');
    const emails: string[] = [];

    // Skip header line if it contains 'email'
    const startIndex = lines[0]?.toLowerCase().includes('email') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        // Handle CSV with commas, quotes, etc.
        const email = line.split(',')[0].replace(/"/g, '').trim();
        if (email && email.includes('@')) {
          emails.push(email);
        }
      }
    }

    return emails;
  };

  const getEmailsToInvite = async (): Promise<string[]> => {
    if (inviteMode === 'single') {
      return singleEmail ? [singleEmail.trim()] : [];
    }

    // Bulk mode
    if (csvFile) {
      const csvContent = await csvFile.text();
      return parseCSV(csvContent);
    }

    if (bulkEmails) {
      return bulkEmails
        .split('\n')
        .map((email) => email.trim())
        .filter((email) => email && email.includes('@'));
    }

    return [];
  };

  const performInvitation = async (
    emails: string[],
    sendEmailFlag: boolean
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/admin/users/invite', {
        emails,
        sendEmail: sendEmailFlag,
      });

      setResults(response.data);

      if (onInviteSuccess) {
        onInviteSuccess();
      }
    } catch (error: any) {
      console.error('Failed to invite users:', error);
      setError(
        error.response?.data?.message ||
          t('adminPortal.invite.errors.invitationFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  const validateDomains = async (emails: string[]) => {
    try {
      const response = await api.post('/admin/users/invite/validate-domains', {
        emails,
      });

      return response.data;
    } catch (error: any) {
      console.error('Failed to validate domains:', error);

      // Provide more specific error messages for domain validation failures
      if (error.response?.status === 403) {
        throw new Error(t('adminPortal.invite.errors.noPermission'));
      } else if (error.response?.status === 409) {
        throw new Error(t('adminPortal.invite.errors.roleRevoked'));
      } else if (error.response?.status === 400) {
        const errorData = error.response?.data;
        if (errorData?.invalidEmails?.length > 0) {
          throw new Error(
            t('adminPortal.invite.errors.invalidEmails', {
              emails: errorData.invalidEmails.join(', '),
            })
          );
        }
        throw new Error(
          errorData?.message || t('adminPortal.invite.errors.invalidRequest')
        );
      }

      // Let role monitor handle privilege revocation errors to avoid conflicts
      // This component will just propagate the error for normal handling
      throw error;
    }
  };

  const handleInvite = async () => {
    setError(null);

    try {
      const emails = await getEmailsToInvite();

      if (emails.length === 0) {
        setError(t('adminPortal.invite.errors.noEmailsProvided'));
        return;
      }

      if (emails.length > 100) {
        setError(t('adminPortal.invite.errors.tooManyEmails'));
        return;
      }

      try {
        // First, validate domains
        const domainValidation = await validateDomains(emails);

        // Store pending invitation
        setPendingInvitation({ emails, sendEmail });

        if (domainValidation.hasAnyUnconfiguredDomains) {
          // Show warning before proceeding
          setUnconfiguredEmails(domainValidation.unconfiguredEmails);
          setShowUnconfiguredWarning(true);
          // Don't resume monitoring yet - wait for user decision
        } else {
          // No unconfigured domains, proceed directly
          await performInvitation(emails, sendEmail);
          // performInvitation will handle resuming
        }
      } catch (validationError: any) {
        throw validationError;
      }
    } catch (error: any) {
      console.error('Failed to prepare invitation:', error);

      // Check for specific admin privilege errors and let role monitor handle them
      if (error.response?.status === 403 || error.response?.status === 409) {
        // Let the role monitor handle privilege revocation - just close dialog
        handleClose();
        return;
      }

      // Use the specific error message if available, otherwise use generic message
      const errorMessage =
        error.message ||
        error.response?.data?.message ||
        t('adminPortal.invite.errors.invitationFailed');

      setError(errorMessage);
    }
  };

  const handleConfirmInvitation = async () => {
    if (pendingInvitation) {
      setShowUnconfiguredWarning(false);
      // Now proceed with the actual invitation
      await performInvitation(
        pendingInvitation.emails,
        pendingInvitation.sendEmail
      );
      // performInvitation will handle resuming role monitoring
    }
  };

  const handleCancelInvitation = () => {
    setShowUnconfiguredWarning(false);
    setPendingInvitation(null);
    setUnconfiguredEmails([]);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - only show when warning dialog is not open */}
      {!showUnconfiguredWarning && (
        <div
          className="fixed inset-0 z-50 bg-gray-500/75 transition-opacity"
          onClick={handleClose}
        />
      )}

      {/* Content container */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
          <div className="inline-block w-full max-w-2xl overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:p-6 sm:align-middle">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center">
                <PiUserPlus className="mr-3 text-2xl text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('adminPortal.invite.title')}
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-500">
                <PiX className="h-6 w-6" />
              </button>
            </div>

            {/* Mode Selection */}
            <div className="mb-6">
              <div className="flex rounded-lg border border-gray-300 p-1">
                <button
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${
                    inviteMode === 'single'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setInviteMode('single')}>
                  <PiEnvelope className="mr-2 inline" />
                  {t('adminPortal.invite.mode.single')}
                </button>
                <button
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${
                    inviteMode === 'bulk'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setInviteMode('bulk')}>
                  <PiUpload className="mr-2 inline" />
                  {t('adminPortal.invite.mode.bulk')}
                </button>
              </div>
            </div>

            {/* Single User Mode */}
            {inviteMode === 'single' && (
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t('adminPortal.invite.singleUser.emailLabel')}
                </label>
                <InputText
                  value={singleEmail}
                  onChange={setSingleEmail}
                  placeholder={t(
                    'adminPortal.invite.singleUser.emailPlaceholder'
                  )}
                  className="w-full"
                />
              </div>
            )}

            {/* Bulk Mode */}
            {inviteMode === 'bulk' && (
              <div className="mb-6">
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {t('adminPortal.invite.bulkMode.csvUpload')}
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {csvFile && (
                    <p className="mt-2 text-sm text-green-600">
                      {t('adminPortal.invite.bulkMode.csvSelected', {
                        filename: csvFile.name,
                      })}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    {t('adminPortal.invite.bulkMode.csvFormat')}
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-gray-500">
                      {t('adminPortal.invite.bulkMode.or')}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {t('adminPortal.invite.bulkMode.manualEntry')}
                  </label>
                  <Textarea
                    value={bulkEmails}
                    onChange={setBulkEmails}
                    placeholder={t(
                      'adminPortal.invite.bulkMode.manualPlaceholder'
                    )}
                    rows={6}
                    className="w-full"
                    disabled={!!csvFile}
                  />
                </div>
              </div>
            )}

            {/* Email Options */}
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  {t('adminPortal.invite.options.sendEmail')}
                </span>
              </label>
              <p className="ml-6 text-xs text-gray-500">
                {sendEmail
                  ? t('adminPortal.invite.options.sendEmailHelp')
                  : t('adminPortal.invite.options.noSendEmailHelp')}
              </p>
            </div>

            {error && (
              <div className="mb-6">
                <Alert severity="error">{error}</Alert>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="mb-6">
                <div className="rounded-lg border border-gray-200 p-4">
                  <h4 className="mb-3 font-semibold text-gray-900">
                    {t('adminPortal.invite.results.title')}
                  </h4>
                  <div className="mb-3 text-sm text-gray-600">
                    {t('adminPortal.invite.results.summary', {
                      total: results.summary.totalRequested,
                      successful: results.summary.successful,
                      failed: results.summary.failed,
                    })}
                  </div>

                  <div className="max-h-60 overflow-y-auto">
                    {results.results.map((result, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between rounded p-2 ${
                          result.success ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                        <span className="text-sm">{result.email}</span>
                        {result.success ? (
                          <span className="text-xs text-green-600">
                            {t('adminPortal.invite.results.invited')}
                          </span>
                        ) : (
                          <span className="text-xs text-red-600">
                            {t('adminPortal.invite.results.failed', {
                              error: result.error,
                            })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {!sendEmail && results.summary.successful > 0 && (
                    <div className="mt-3 rounded bg-yellow-50 p-3">
                      <p className="text-sm text-yellow-800">
                        {/* eslint-disable-next-line @shopify/jsx-no-hardcoded-content */}
                        <span className="font-semibold">
                          {
                            t('adminPortal.invite.results.warning').split(
                              ':'
                            )[0]
                          }
                          :
                        </span>
                        {t('adminPortal.invite.results.warning')
                          .split(':')
                          .slice(1)
                          .join(':')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button outlined={true} onClick={handleClose} disabled={loading}>
                {results
                  ? t('adminPortal.invite.actions.close')
                  : t('adminPortal.invite.actions.cancel')}
              </Button>
              {!results && (
                <Button
                  onClick={handleInvite}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700">
                  {loading ? (
                    <>
                      <LoadingWave />
                      {t('adminPortal.invite.actions.inviting')}
                    </>
                  ) : (
                    <>
                      <PiUserPlus className="mr-2" />
                      {t('adminPortal.invite.actions.sendInvitations')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Unconfigured Domain Warning Dialog */}
      {showUnconfiguredWarning && (
        <>
          {/* Warning backdrop */}
          <div className="fixed inset-0 z-[60] bg-gray-500/75 transition-opacity" />

          {/* Warning content container */}
          <div className="fixed inset-0 z-[60] overflow-y-auto">
            <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
              <div className="inline-block w-full max-w-lg overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:p-6 sm:align-middle">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-orange-800">
                    {t('adminPortal.invite.unconfiguredDomain.title')}
                  </h3>
                </div>

                <div className="mb-4">
                  <p className="mb-3 text-sm text-gray-700">
                    {t('adminPortal.invite.unconfiguredDomain.message')}
                  </p>

                  <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
                    <h4 className="mb-2 text-sm font-medium text-orange-800">
                      {t('adminPortal.invite.unconfiguredDomain.affectedUsers')}
                    </h4>
                    <ul className="space-y-1 text-sm text-orange-700">
                      {unconfiguredEmails.map((email, index) => (
                        <li key={index} className="font-mono">
                          {email}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button outlined={true} onClick={handleCancelInvitation}>
                    {t('adminPortal.invite.unconfiguredDomain.cancel')}
                  </Button>
                  <Button
                    onClick={handleConfirmInvitation}
                    disabled={loading}
                    className="bg-orange-600 text-white hover:bg-orange-700">
                    {loading ? (
                      <>
                        <LoadingWave />
                        {t('adminPortal.invite.actions.inviting')}
                      </>
                    ) : (
                      t('adminPortal.invite.unconfiguredDomain.proceedAnyway')
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default UserInviteDialog;
