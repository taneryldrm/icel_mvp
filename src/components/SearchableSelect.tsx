import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

interface SearchableSelectProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder = "Seçiniz", disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter options based on search term
    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Effect to update search term when value changes externally (e.g. reset)
    useEffect(() => {
        if (!value) setSearchTerm('');
    }, [value]);

    const handleSelect = (option: string) => {
        onChange(option);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full min-h-[42px] px-3 py-2 bg-white border rounded-lg flex items-center justify-between cursor-pointer transition-all ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'hover:border-[#f0c961] focus-within:border-[#f0c961] focus-within:ring-1 focus-within:ring-[#f0c961]'} ${isOpen ? 'border-[#f0c961] ring-1 ring-[#f0c961]' : 'border-gray-200'}`}
            >
                <span className={`text-sm truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                    {value || placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-gray-50 bg-gray-50/50 sticky top-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:border-[#f0c961] focus:ring-1 focus:ring-[#f0c961]/20 placeholder-gray-400"
                                placeholder="Ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    <ul className="max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, idx) => (
                                <li
                                    key={idx}
                                    onClick={() => handleSelect(option)}
                                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-[#fffaf4] hover:text-[#f0c961] flex items-center justify-between transition-colors ${value === option ? 'bg-gray-50 font-bold text-[#f0c961]' : 'text-gray-700'}`}
                                >
                                    {option}
                                    {value === option && <Check className="w-4 h-4" />}
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-3 text-sm text-gray-400 text-center">Sonuç bulunamadı</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
