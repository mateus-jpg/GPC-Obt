'use client';

import { useState } from 'react';
import {
  Folder,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  MoreVertical,
  Download,
  Trash2,
  Edit,
  FileCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/utils';
import { format } from 'date-fns';
import { getFileUrl } from '@/actions/files/files';
import { toast } from 'sonner';

/**
 * Get appropriate icon for file type
 */
function getFileIcon(mimeType, className = 'w-12 h-12') {
  if (!mimeType) return <File className={className} />;

  if (mimeType.startsWith('image/')) {
    return <FileImage className={cn(className, 'text-green-500')} />;
  }
  if (mimeType.startsWith('video/')) {
    return <FileVideo className={cn(className, 'text-purple-500')} />;
  }
  if (mimeType.startsWith('audio/')) {
    return <FileAudio className={cn(className, 'text-pink-500')} />;
  }
  if (mimeType === 'application/pdf') {
    return <FileText className={cn(className, 'text-red-500')} />;
  }
  if (
    mimeType.includes('zip') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z')
  ) {
    return <FileArchive className={cn(className, 'text-orange-500')} />;
  }
  if (
    mimeType.includes('javascript') ||
    mimeType.includes('json') ||
    mimeType.includes('html')
  ) {
    return <FileCode className={cn(className, 'text-blue-500')} />;
  }

  return <FileText className={cn(className, 'text-gray-500')} />;
}

/**
 * Grid item for a folder
 */
function FolderGridItem({ folder, onOpen, onRename, onMove, onDelete, isSelected }) {
  const canDelete = !folder.isDefaultCategory;

  return (
    <Card
      className={cn(
        'relative group cursor-pointer hover:shadow-md transition-shadow',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={() => onOpen(folder.id)}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center">
          {/* Icon */}
          <div className="mb-3">
            <Folder className="w-16 h-16 text-blue-500" />
          </div>

          {/* Name */}
          <p
            className="text-sm font-medium text-center truncate w-full px-2"
            title={folder.nome}
          >
            {folder.nome}
          </p>

          {/* Badge for default folders */}
          {folder.isDefaultCategory && (
            <span className="text-xs text-muted-foreground mt-1">Default</span>
          )}
        </div>

        {/* Actions Menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!folder.isDefaultCategory && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onRename?.(folder);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove?.(folder);
                    }}
                  >
                    <Folder className="mr-2 h-4 w-4" />
                    Move
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(folder);
                }}
                disabled={!canDelete}
                className="text-destructive focus:text-destructive disabled:opacity-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {!canDelete && '(Protected)'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Grid item for a file
 */
function FileGridItem({ file, onDelete, onRename, isSelected }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e) => {
    e.stopPropagation();
    setIsDownloading(true);
    try {
      const result = await getFileUrl(file.id);
      if (result.error) {
        toast.error(result.message || 'Failed to get download URL');
        return;
      }
      window.open(result.url, '_blank');
      toast.success('Opening file...');
    } catch (error) {
      console.error('[DOWNLOAD_ERROR]:', error);
      toast.error('Failed to download file');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card
      className={cn(
        'relative group cursor-pointer hover:shadow-md transition-shadow',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={handleDownload}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center">
          {/* Icon */}
          <div className="mb-3">{getFileIcon(file.tipo, 'w-16 h-16')}</div>

          {/* Name */}
          <p
            className="text-sm font-medium text-center truncate w-full px-2"
            title={file.nome}
          >
            {file.nome}
          </p>

          {/* Size */}
          <p className="text-xs text-muted-foreground mt-1">
            {formatBytes(file.dimensione || 0)}
          </p>

          {/* Modified date */}
          {file.updatedAt && (
            <p className="text-xs text-muted-foreground">
              {format(new Date(file.updatedAt), 'dd/MM/yyyy')}
            </p>
          )}
        </div>

        {/* Actions Menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleDownload}
                disabled={isDownloading}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRename?.(file);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(file);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Google Drive-style grid view for files and folders
 */
export default function FileGridView({
  files = [],
  subfolders = [],
  onFolderOpen,
  onFileDelete,
  onFileRename,
  onFolderDelete,
  onFolderRename,
  onFolderMove,
  isLoading = false,
  selectedItems = [],
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-muted rounded mb-3" />
                <div className="h-4 w-24 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (subfolders.length === 0 && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Folder className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          This folder is empty
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Upload files or create subfolders to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {/* Folders first */}
      {subfolders.map((folder) => (
        <FolderGridItem
          key={folder.id}
          folder={folder}
          onOpen={onFolderOpen}
          onRename={onFolderRename}
          onMove={onFolderMove}
          onDelete={onFolderDelete}
          isSelected={selectedItems.includes(folder.id)}
        />
      ))}

      {/* Then files */}
      {files.map((file) => (
        <FileGridItem
          key={file.id}
          file={file}
          onDelete={onFileDelete}
          onRename={onFileRename}
          isSelected={selectedItems.includes(file.id)}
        />
      ))}
    </div>
  );
}
